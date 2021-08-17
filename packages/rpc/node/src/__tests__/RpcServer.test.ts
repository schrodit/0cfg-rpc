import fetch from 'node-fetch';
import {HttpStatusCode} from '@0cfg/http-common/lib/HttpStatusCode';
import {errStatus, getOk, okStatus, Reply} from '@0cfg/reply-common/lib/Reply';
import {RpcServer, RpcServerConfig} from '../ts/RpcServer';
import {MockMiddleware, MockRequestReplyService, MockRequestReplyServiceArgs} from '../__mocks__/MockRequestReply';
import {stringify} from '@0cfg/utils-common/lib/stringify';
import {ReconnectingWebSocket} from '@0cfg/stubs-node/lib/messaging/ReconnectingWebSocket';
import {Endpoint, HttpEndpoint, WebSocketEndpoint} from '@0cfg/rpc-common/lib/stub/Endpoint';
import {HttpContext} from '@0cfg/rpc-common/lib/HttpContext';
import {BidiStreamStub} from '@0cfg/rpc-common/lib/stub/BidiStreamStub';
import {bidiStreamFactory} from '../ts/BidiStreamService';
import {MockBidiStream} from '../__mocks__/MockBidiStream';
import {ServerStreamStub} from '@0cfg/rpc-common/lib/stub/ServerStreamStub';
import {expectReply} from '@0cfg/reply-common/lib/TestHelper';
import {MockServerStream} from '../__mocks__/MockServerStream';
import {serverStreamFactory} from '../ts/ServerStreamService';
import {MockClientStream} from '../__mocks__/MockClientStream';
import {clientStreamFactory} from '../ts/ClientStreamService';
import {ClientStreamStub} from '@0cfg/rpc-common/lib/stub/ClientStreamStub';

export enum TestServiceMethods {
    RequestReply = 'RequestReply',
    OtherStatusCode = 'OtherStatusCode',
    FailingMiddleware = 'FailingMiddleware',
    PingPong = 'PingPong',
    ServerStreamMock = 'ServerStreamMock',
    ClientStreamMock = 'ClientStreamMock',
}

export class TestServiceStub {
    private endpoint: Endpoint<HttpContext>;

    public constructor(endpoint: Endpoint<HttpContext>) {
        this.endpoint = endpoint;
    }

    public requestReply(args: MockRequestReplyServiceArgs): Promise<Reply<string>> {
        return this.endpoint.requestReplyStub.execute(TestServiceMethods.RequestReply, args);
    }

    public otherStatusCode(args: MockRequestReplyServiceArgs): Promise<Reply<string>> {
        return this.endpoint.requestReplyStub.execute(TestServiceMethods.OtherStatusCode, args);
    }

    public failingMiddleware(args: MockRequestReplyServiceArgs): Promise<Reply<string>> {
        return this.endpoint.requestReplyStub.execute(TestServiceMethods.FailingMiddleware, args);
    }

    public pingPongBidiStream(): BidiStreamStub<'ping', 'pong'> {
        return this.endpoint.newBidiStreamStub<'ping', 'pong'>(TestServiceMethods.PingPong);
    }

    public mockServerStream(): ServerStreamStub<'init', 'mock'> {
        return this.endpoint.newServerStreamStub<'init', 'mock'>(TestServiceMethods.ServerStreamMock);
    }

    public mockClientStream(): ClientStreamStub<'ping'> {
        return this.endpoint.newClientStreamStub<'ping'>(TestServiceMethods.ClientStreamMock);
    }
}

const EXPECTED_MESSAGES = 1000;
const PORT = 8080;
const mockServiceMiddleware = new MockMiddleware(getOk(), HttpStatusCode.Ok);
const mockServerMiddleware = new MockMiddleware(getOk(), HttpStatusCode.Ok);
const failingMiddleware = new MockMiddleware(errStatus('Bad arguments.'), HttpStatusCode.BadRequest);

const basicRequestReply = new MockRequestReplyService(TestServiceMethods.RequestReply, mockServiceMiddleware);
const otherStatusCodeRequestReply = new MockRequestReplyService(TestServiceMethods.OtherStatusCode,
    undefined, HttpStatusCode.BadRequest);
const failingMiddlewareRequestReply = new MockRequestReplyService(TestServiceMethods.FailingMiddleware,
    failingMiddleware, HttpStatusCode.Ok);

const mockBidiStream = new MockBidiStream(TestServiceMethods.PingPong, mockServiceMiddleware);
const mockServerStream = new MockServerStream(TestServiceMethods.ServerStreamMock, mockServiceMiddleware);
const mockClientStream = new MockClientStream(TestServiceMethods.ClientStreamMock, mockServiceMiddleware);

const withMockRequestReply = RpcServerConfig.newBuilder().setPort(PORT)
    .allowAllOriginsAndHeadersAndRequests()
    .addServerMiddleware(mockServerMiddleware)
    .addRequestReplyService(basicRequestReply)
    .addRequestReplyService(failingMiddlewareRequestReply)
    .addRequestReplyService(otherStatusCodeRequestReply)
    // use constant to be able to use test class, do not do this in production code
    .addBidiStreamService(bidiStreamFactory(TestServiceMethods.PingPong,
        () => mockBidiStream))
    .addServerStreamService(serverStreamFactory(TestServiceMethods.ServerStreamMock,
        () => mockServerStream))
    .addClientStreamService(clientStreamFactory(TestServiceMethods.ClientStreamMock,
        () => mockClientStream));

const server = new RpcServer(withMockRequestReply.build());
const clientSocket = new ReconnectingWebSocket('ws://localhost:' + PORT);
const webSocketEndpoint = new WebSocketEndpoint(clientSocket);
const httpEndpoint = new HttpEndpoint('http://localhost:' + PORT);
const httpStub = new TestServiceStub(httpEndpoint);
const websocketStub = new TestServiceStub(webSocketEndpoint);

beforeAll(async () => {
    await server.listen();
    await clientSocket.connect();
});

afterAll(async () => {
    clientSocket.close();
    await server.close();
});

beforeEach(() => {
    basicRequestReply.reset();
    otherStatusCodeRequestReply.reset();
    mockServiceMiddleware.reset();
    mockServerMiddleware.reset();
    failingMiddlewareRequestReply.reset();
    failingMiddleware.reset();
    mockBidiStream.reset();
    mockServerStream.reset();
    mockClientStream.reset();
});

test('request over native http with unparseable body.', async () => {
    const result = await fetch(`http://localhost:${PORT}/requestReply`, {method: 'POST', body: 'unparseable'});
    expect(result.status).toBe(HttpStatusCode.BadRequest);
    const json = await result.json();
    expect(Reply.createFromSerializedReply<never>(json).notOk()).toBe(true);
    expect(basicRequestReply.calledNTimes).toBe(0);
    expect(mockServiceMiddleware.calledNTimes).toBe(0);
    expect(mockServerMiddleware.calledNTimes).toBe(0);
});

test('request over native http with undefined body.', async () => {
    const result = await fetch(`http://localhost:${PORT}/requestReply`, {method: 'POST'});
    expect(result.status).toBe(HttpStatusCode.BadRequest);
    const json = await result.json();
    expect(Reply.createFromSerializedReply<never>(json).notOk()).toBe(true);
    expect(basicRequestReply.calledNTimes).toBe(0);
    expect(mockServiceMiddleware.calledNTimes).toBe(0);
    expect(mockServerMiddleware.calledNTimes).toBe(0);
});

test('request over native http with valid parameters.', async () => {
    const result = await fetch(`http://localhost:${PORT}/requestReply`, {
        method: 'POST',
        body: stringify({name: 'Jonas du alte Socke'}),
    });
    expect(result.status).toBe(HttpStatusCode.Ok);
    const json = await result.json();
    expect(json).toEqual(okStatus('Hi Jonas du alte Socke.').toSerializedReply());
    expect(Reply.createFromSerializedReply<never>(json).ok()).toBe(true);
    expect(basicRequestReply.calledNTimes).toBe(1);
    expect(basicRequestReply.lastArgs).toEqual({name: 'Jonas du alte Socke'});
    expect(mockServiceMiddleware.calledNTimes).toBe(1);
    expect(mockServerMiddleware.calledNTimes).toBe(1);
    expect(mockServiceMiddleware.lastArgs).toEqual({name: 'Jonas du alte Socke'});
    expect(mockServerMiddleware.lastArgs).toEqual({name: 'Jonas du alte Socke'});
});

test('request over native http with valid parameters other status code.', async () => {
    const result = await fetch(`http://localhost:${PORT}/otherStatusCode`, {
        method: 'POST',
        body: stringify({name: 'Jonas du alte Socke'}),
    });
    expect(result.status).toBe(HttpStatusCode.BadRequest);
    const json = await result.json();
    expect(json).toEqual(okStatus('Hi Jonas du alte Socke.').toSerializedReply());
    expect(Reply.createFromSerializedReply<never>(json).ok()).toBe(true);
    expect(otherStatusCodeRequestReply.calledNTimes).toBe(1);
    expect(otherStatusCodeRequestReply.lastArgs).toEqual({name: 'Jonas du alte Socke'});
});

test('request over http stub with unparseable parameters.', async () => {
    // valid json
    expect((await httpStub.requestReply(
        'unparseable' as unknown as MockRequestReplyServiceArgs)).getValue()).toBe('Hi undefined.');
    expect(basicRequestReply.calledNTimes).toBe(1);
});

test('request over http stub with undefined parameters.', async () => {
    expect((await httpStub.requestReply(
        undefined as unknown as MockRequestReplyServiceArgs)).notOk()).toBe(true);
    expect(basicRequestReply.calledNTimes).toBe(0);
});

test('request over http stub with valid parameters.', async () => {
    expect((await httpStub.requestReply(
        {name: 'Jonas du alte Socke'})).getValue()).toBe('Hi Jonas du alte Socke.');
    expect(basicRequestReply.calledNTimes).toBe(1);
});

test('request over http stub with valid parameters other status code.', async () => {
    expect((await httpStub.otherStatusCode(
        {name: 'Jonas du alte Socke'})).getValue()).toBe('Hi Jonas du alte Socke.');
    expect(otherStatusCodeRequestReply.calledNTimes).toBe(1);
});

test('request over http stub with valid parameters other status code.', async () => {
    expect((await httpStub.otherStatusCode(
        {name: 'Jonas du alte Socke'})).getValue()).toBe('Hi Jonas du alte Socke.');
    expect(otherStatusCodeRequestReply.calledNTimes).toBe(1);
});

test('request over http middleware with failing middleware', async () => {
    expect((await httpStub.failingMiddleware(
        {name: 'Jonas du alte Socke'})).getErrorMessage()).toEqual('Bad arguments.');
    expect(failingMiddleware.calledNTimes).toBe(1);
    expect(failingMiddlewareRequestReply.calledNTimes).toBe(0);
});

test('request websocket stub with valid parameters other status code.', async () => {
    expect((await websocketStub.otherStatusCode(
        {name: 'Jonas du alte Socke'})).getValue()).toBe('Hi Jonas du alte Socke.');
    expect(otherStatusCodeRequestReply.calledNTimes).toBe(1);
});

test('request websocket stub with valid parameters other status code.', async () => {
    expect((await websocketStub.otherStatusCode(
        {name: 'Jonas du alte Socke'})).getValue()).toBe('Hi Jonas du alte Socke.');
    expect(otherStatusCodeRequestReply.calledNTimes).toBe(1);
});

test('request over websocket stub with valid parameters.', async () => {
    expect((await websocketStub.requestReply(
        {name: 'Jonas du alte Socke'})).getValue()).toBe('Hi Jonas du alte Socke.');
    expect(basicRequestReply.calledNTimes).toBe(1);
    expect(basicRequestReply.lastArgs).toEqual({name: 'Jonas du alte Socke'});
    expect(mockServiceMiddleware.calledNTimes).toBe(1);
    expect(mockServerMiddleware.calledNTimes).toBe(1);
    expect(mockServiceMiddleware.lastArgs).toEqual({name: 'Jonas du alte Socke'});
    expect(mockServerMiddleware.lastArgs).toEqual({name: 'Jonas du alte Socke'});
});

test('request over websocket stub with failing middleware.', async () => {
    expect((await websocketStub.failingMiddleware(
        {name: 'Jonas du alte Socke'})).getErrorMessage()).toEqual('Bad arguments.');
    expect(failingMiddlewareRequestReply.calledNTimes).toBe(0);
    expect(failingMiddleware.calledNTimes).toBe(1);
});

test('bidi stream over websocket closed by client', async () => {
    const stream = websocketStub.pingPongBidiStream();

    let received = 0;

    const allRepliesReceived = new Promise<void>(resolve => {
        stream.onMessage(async (message: 'pong') => {
            expect(message).toEqual('pong');
            received++;
            if (received === EXPECTED_MESSAGES) {
                resolve();
            }
        });
    });

    for (let i = 0; i < EXPECTED_MESSAGES; i++) {
        stream.send('ping');
    }

    await allRepliesReceived;
    stream.complete(getOk());

    await mockBidiStream.completePromise;

    expect(received).toBe(EXPECTED_MESSAGES);
    expect(mockBidiStream.receivedCount).toBe(EXPECTED_MESSAGES);
    expect(mockServiceMiddleware.calledNTimes).toBe(EXPECTED_MESSAGES);
    expect(mockBidiStream.completed).toEqual(getOk());
});

test('bidi stream over websocket closed by server', async () => {
    const stream = websocketStub.pingPongBidiStream();

    let received = 0;

    const allRepliesReceived = new Promise<void>(resolve => {
        stream.onMessage(async (message: 'pong') => {
            expect(message).toEqual('pong');
            received++;
            if (received === EXPECTED_MESSAGES) {
                resolve();
            }
        });
    });

    const start = Date.now();

    for (let i = 0; i < EXPECTED_MESSAGES; i++) {
        stream.send('ping');
    }

    await allRepliesReceived;

    const completionPromise = new Promise<Reply>(
        resolve => stream.onCompleted(async (end: Reply) => {
                resolve(end);
            }
        ));

    mockBidiStream.complete(getOk());

    await expect(completionPromise).resolves.toEqual(getOk());
    expect(received).toBe(EXPECTED_MESSAGES);
    expect(mockBidiStream.receivedCount).toBe(EXPECTED_MESSAGES);
    expect(mockServiceMiddleware.calledNTimes).toBe(EXPECTED_MESSAGES);
});

test('server stream over websocket closed by client', async () => {
    const stream = websocketStub.mockServerStream();

    stream.start('init');

    const completionPromise = new Promise<Reply>(
        resolve => stream.onCompleted(async (end: Reply) => {
                resolve(end);
            }
        ));

    stream.complete(getOk());

    await expectReply(completionPromise).resolves.toBeOk();
});

test('server stream over websocket closed by server', async () => {
    const stream = websocketStub.mockServerStream();

    stream.start('init');

    const completionPromise = new Promise<Reply>(
        resolve => stream.onCompleted(async (end: Reply) => {
                resolve(end);
            }
        ));

    await mockServerStream.started();
    mockServerStream.complete(getOk());

    await expectReply(completionPromise).resolves.toBeOk();
});

test('client stream over websocket closed by client', async () => {
    const stream = websocketStub.mockClientStream();
    mockClientStream.setExpectedMessages(EXPECTED_MESSAGES);

    for(let i = 0; i < EXPECTED_MESSAGES; i++) {
        stream.send('ping');
    }

    await mockClientStream.receivedPromise;
    stream.complete(getOk());

    await mockClientStream.completePromise;

    expect(mockClientStream.receivedCount).toBe(EXPECTED_MESSAGES);
    expect(mockServiceMiddleware.calledNTimes).toBe(EXPECTED_MESSAGES);
    expect(mockClientStream.completed).toEqual(getOk());
});

test('client stream over websocket closed by server', async () => {
    const stream = websocketStub.mockClientStream();
    mockClientStream.setExpectedMessages(EXPECTED_MESSAGES);

    for (let i = 0; i < EXPECTED_MESSAGES; i++) {
        stream.send('ping');
    }

    await mockClientStream.receivedPromise;
    mockClientStream.complete(getOk());

    await mockClientStream.completePromise;

    expect(mockClientStream.receivedCount).toBe(EXPECTED_MESSAGES);
    expect(mockServiceMiddleware.calledNTimes).toBe(EXPECTED_MESSAGES);
    expect(mockClientStream.completed).toEqual(getOk());
});