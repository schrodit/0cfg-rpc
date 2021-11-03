import http from 'http';
import WebSocket from 'ws';
import {ReconnectingWebSocket} from '../ts/messaging/ReconnectingWebSocket';
import {wait} from '@0cfg/utils-common/lib/wait';
import {has} from '@0cfg/utils-common/lib/has';

const servers: Record<number, http.Server> = {};

const getPort = () => 3000 + Number.parseInt(process.env.JEST_WORKER_ID!);

const createWebSocketServer = () => new WebSocket.Server({server: servers[getPort()]});

const openServer = async () => {
    const port = getPort();
    servers[port] = http.createServer();
    await new Promise((resolve) => {
        servers[port].listen(port, () => resolve());
    });
};

const closeServer = async () => {
    const port = getPort();
    await new Promise(resolve => servers[port].close(resolve));
    delete servers[port];
};

beforeEach(openServer);
afterEach(closeServer);

test('connects', async () => {
    const webSocketServer = createWebSocketServer();
    const connect = jest.fn();
    webSocketServer.on('connection', connect);
    const ws = new ReconnectingWebSocket('ws://localhost:' + getPort());
    await ws.connect();
    expect(connect).toBeCalled();
    ws.close();
    webSocketServer.close();
});

type ListenerMocks = {
    serverConnect?: jest.Mock,
    clientMessage?: jest.Mock,
    serverMessage?: jest.Mock,
    clientClose?: jest.Mock,
    serverClose?: jest.Mock,
}

const setupSocketAndListeners = (listenerMocks: ListenerMocks,
                                 webSocketServer: WebSocket.Server): ReconnectingWebSocket => {
    const {serverConnect, clientMessage, serverMessage, clientClose, serverClose} = listenerMocks;

    let pingInterval: NodeJS.Timeout;
    webSocketServer.on('connection', socket => {
        has(serverConnect) && serverConnect();
        has(serverMessage) && socket.on('message', serverMessage);
        has(serverClose) && socket.on('close', serverClose);
        // Start the keep alive ping
        pingInterval = setInterval(() => socket.ping(), 4000);
    });
    webSocketServer.on('close', () => clearInterval(pingInterval));

    const ws = new ReconnectingWebSocket('ws://localhost:' + getPort(),
        undefined, undefined, undefined, {
            maxReconnects: Number.MAX_SAFE_INTEGER,
            reconnectTimeout: 200,
        });
    has(clientClose) && ws.addEventListener('close', clientClose);
    has(clientMessage) && ws.onMessage(clientMessage);
    return ws;
};

const openWebSocketServer = async (connectMock: jest.Mock): Promise<WebSocket.Server> => {
    await openServer();
    const webSocketServer = createWebSocketServer();
    webSocketServer.on('connection', connectMock);
    return webSocketServer;
};

test('reconnects', async () => {
    let webSocketServer = createWebSocketServer();
    const serverConnect = jest.fn();
    const clientClose = jest.fn();

    const ws = setupSocketAndListeners({serverConnect, clientClose}, webSocketServer);
    await ws.connect();
    await ws.resolveWhenConnected();

    const close: Promise<never> = new Promise(resolve => ws.addEventListener('close', resolve));
    webSocketServer.close();
    await closeServer();
    await close;

    wait(500).then(async () => {
        webSocketServer = await openWebSocketServer(serverConnect);
    });

    await ws.resolveWhenConnected();

    expect(serverConnect).toBeCalledTimes(2);
    expect(clientClose).toBeCalledTimes(2);
    ws.terminate();
});

test('reconnects multiple times', async () => {
    let webSocketServer = createWebSocketServer();
    const serverConnect = jest.fn();
    const clientClose = jest.fn();

    const ws = setupSocketAndListeners({serverConnect, clientClose}, webSocketServer);
    await ws.connect();
    await ws.resolveWhenConnected();
    for (let i = 0; i < 5; i++) {
        const close: Promise<never> = new Promise(resolve => ws.addEventListener('close', resolve));
        webSocketServer.close();
        await closeServer();
        await close;

        await wait(500);
        webSocketServer = await openWebSocketServer(serverConnect);
        await ws.resolveWhenConnected();
    }

    expect(serverConnect).toBeCalledTimes(6);
    expect(clientClose).toBeCalledTimes(6);
    ws.terminate();
});

test('connection stays open', async () => {
    jest.setTimeout(11000);
    const listenerMocks = {
        clientConnect: jest.fn(),
        serverConnect: jest.fn(),
        clientClose: jest.fn(),
        serverClose: jest.fn(),
    };
    const {serverConnect, clientConnect, clientClose, serverClose} = listenerMocks;
    const webSocketServer = createWebSocketServer();
    const ws = setupSocketAndListeners(listenerMocks, webSocketServer);
    await ws.connect();
    await ws.resolveWhenConnected();
    await wait(10000);
    expect(serverConnect).toBeCalledTimes(1);
    expect(clientClose).toBeCalledTimes(0);
    expect(serverClose).toBeCalledTimes(0);
    ws.terminate();
    webSocketServer.close();
});