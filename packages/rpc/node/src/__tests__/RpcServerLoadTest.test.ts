import {milliSecondsInASecond} from "@0cfg/utils-common/lib/timeSpan";
import {ReconnectingWebSocket} from "@0cfg/stubs-node/lib/messaging/ReconnectingWebSocket";
import {WebSocketEndpoint} from "@0cfg/rpc-common/lib/stub/Endpoint";
import {getOk, Reply} from "@0cfg/reply-common/lib/Reply";
import {TestServiceMethods, TestServiceStub} from "./RpcServer.test";
import {RpcServer, RpcServerConfig} from "../ts/RpcServer";
import {bidiStreamFactory} from "../ts/BidiStreamService";
import {MockBidiStream} from "../ts/__mocks__/MockBidiStream";
import {expectReply} from "@0cfg/reply-common/lib/TestHelper";

const LOAD_TEST_SOCKETS = 200;
const MESSAGES_PER_SOCKET = 200;
const PORT = 8081;

const withMockRequestReply = RpcServerConfig.newBuilder()
    .setPort(PORT)
    .allowAllOriginsAndHeadersAndRequests()
    .addBidiStreamService(bidiStreamFactory(TestServiceMethods.PingPong,
        () => new MockBidiStream(TestServiceMethods.PingPong)));
const server = new RpcServer(withMockRequestReply.build());

beforeAll(async () => {
    await server.listen();
});

afterAll(async () => {
    await server.close();
});

test('Websocket load test', async () => {
    jest.setTimeout(LOAD_TEST_SOCKETS * 100);
    const sockets: ReconnectingWebSocket[] = [];
    for (let i = 0; i < LOAD_TEST_SOCKETS; i++) {
        sockets.push(new ReconnectingWebSocket('ws://localhost:' + PORT));
    }

    await Promise.all(sockets.map(async socket => {
        await socket.connect();
        const webSocketEndpoint = new WebSocketEndpoint(socket);
        const websocketStub = new TestServiceStub(webSocketEndpoint);
        return websocketStub.newPingPongBidiStream()
    }).map(async streamPromise => {
        const stream = await streamPromise;
        let received = 0;

        const allRepliesReceived = new Promise<void>(resolve => {
            stream.onMessage(async (message: 'pong') => {
                expect(message).toEqual('pong');
                received++;
                if (received === MESSAGES_PER_SOCKET) {
                    resolve();
                }
            });
        });

        for (let i = 0; i < MESSAGES_PER_SOCKET; i++) {
            stream.send('ping');
        }
        await allRepliesReceived;

        stream.complete(getOk());

        expect(received).toBe(MESSAGES_PER_SOCKET);
        const completionPromise = new Promise<Reply>(
            resolve => stream.onCompleted(async (end: Reply) => {
                    resolve(end);
                }
            )
        );
        await expectReply(completionPromise).resolves.toBeOk();
    }));

    sockets.map(socket => socket.close());
});
