import http from 'http';
import WebSocket from 'ws';
import {ReconnectingWebSocket} from '../ReconnectingWebSocket';
import {wait} from '@0cfg/utils-common/lib/wait';

const servers: Record<number, http.Server> = {};

const getPort = () => 3000 + Number.parseInt(process.env.JEST_WORKER_ID!);

const getWebSocketServer = () => new WebSocket.Server({server: servers[getPort()]});

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
    const webSocketServer = getWebSocketServer();
    const connect = jest.fn();
    webSocketServer.on('connection', connect);
    const ws = new ReconnectingWebSocket('ws://localhost:' + getPort());
    await ws.connect();
    expect(connect).toBeCalled();
    ws.close();
    webSocketServer.close();
});

const setupSocketAndListeners = async (connectMock: jest.Mock, closedMock: jest.Mock,
                                       webSocketServer: WebSocket.Server): Promise<ReconnectingWebSocket> => {
    webSocketServer.on('connection', connectMock);
    const ws = new ReconnectingWebSocket('ws://localhost:' + getPort(),
        undefined, undefined, 100, {
            maxReconnects: Number.MAX_SAFE_INTEGER,
            reconnectTimeout: 200,
        });
    ws.addEventListener('close', () => closedMock());
    await ws.connect();
    await ws.resolveWhenConnected();
    return ws;
};

const openWebSocketServer = async (connectMock: jest.Mock): Promise<WebSocket.Server> => {
    await openServer();
    const webSocketServer = getWebSocketServer();
    webSocketServer.on('connection', connectMock);
    return webSocketServer;
};

test('reconnects', async () => {
    let webSocketServer = getWebSocketServer();
    const connectMock = jest.fn();
    const closedMock = jest.fn();

    const ws = await setupSocketAndListeners(connectMock, closedMock, webSocketServer);

    const close: Promise<never> = new Promise(resolve => ws.addEventListener('close', resolve));
    webSocketServer.close();
    await closeServer();
    await close;

    wait(500).then(async () => {
        webSocketServer = await openWebSocketServer(connectMock);
    });

    await ws.resolveWhenConnected();

    expect(connectMock).toBeCalledTimes(2);
    expect(closedMock).toBeCalledTimes(2);
});

test('reconnects multiple times', async () => {
    let webSocketServer = getWebSocketServer();
    const connectMock = jest.fn();
    const closedMock = jest.fn();

    const ws = await setupSocketAndListeners(connectMock, closedMock, webSocketServer);

    for (let i = 0; i < 5; i++) {
        const close: Promise<never> = new Promise(resolve => ws.addEventListener('close', resolve));
        webSocketServer.close();
        await closeServer();
        await close;

        await wait(500);
        webSocketServer = await openWebSocketServer(connectMock);
        await ws.resolveWhenConnected();
    }

    expect(connectMock).toBeCalledTimes(6);
    expect(closedMock).toBeCalledTimes(6);
});
