import {errStatus, okStatus, Reply} from '@0cfg/reply-common/lib/Reply';
import {wait} from '@0cfg/utils-common/lib/wait';
import {expectReply} from '@0cfg/reply-common/lib/TestHelper';
import {ReconnectConfig, ReconnectingClient} from '../ReconnectingClient';

const reconnectConfig = {
    maxReconnects: 10,
    reconnectTimeout: 100,
};

class MockReconnectingClient extends ReconnectingClient {
    protected connectToExternalService: () => Promise<Reply>;

    /**
     * @param onReconnectsExceeded Will be called once the number of reconnection attempts exceeds
     *     the max reconnects ({@link IReconnectConfig.maxReconnects}) given in {@param config}.
     * @param config {@see IReconnectConfig}
     * @param connectToExternalService Implementation of {@link ReconnectingExternalService.connectToExternalService}
     */
    public constructor(
        config: ReconnectConfig,
        connectToExternalService: () => Promise<Reply>) {
        super(config);
        this.connectToExternalService = connectToExternalService;
    }

    public fakeConnectionFailure(): Promise<Reply> {
        return this.onDisconnect(errStatus('Fake: Connection failed.'));
    }
}

test('Successful connection', async () => {
    const connectToExternalService = jest.fn(async (): Promise<Reply> => Reply.getOk());
    const externalService = new MockReconnectingClient(
        reconnectConfig,
        connectToExternalService);

    await expectReply(externalService.connect()).resolves.toBeOk();
    await expectReply(connectToExternalService).toBeCalledTimes(1);

    // Successive calls don't call connectToExternalService again
    await expectReply(externalService.connect()).resolves.toBeOk();
    await expectReply(connectToExternalService).toBeCalledTimes(1);
});

test('Temporary connection loss', async () => {
    const onReconnectsExceeded = jest.fn();
    const calledAfterReconnect = jest.fn();
    const connectToExternalService = jest.fn()
        .mockImplementationOnce(() => okStatus('Connection successful'))
        .mockImplementationOnce(() => {
            // Add a connection listener while the connection is down.
            (expectReply(externalService.resolveWhenConnected()).resolves.toBeOk()).then(calledAfterReconnect);
            return errStatus('Connecting failed.');
        })
        .mockImplementationOnce(() => {
            // The service is not reconnected yet. calledAfterReconnect should not be called
            expect(calledAfterReconnect).not.toBeCalled();
            // Add a connection listener while the connection is down.
            (expectReply(externalService.resolveWhenConnected()).resolves.toBeOk()).then(calledAfterReconnect);
            return errStatus('Connecting failed again.');
        })
        .mockImplementationOnce(() => {
            // The service is not reconnected yet. calledAfterReconnect should not be called
            expect(calledAfterReconnect).not.toBeCalled();

            return okStatus('Connection successful after temporary connection loss');
        });

    const externalService = new MockReconnectingClient(
        reconnectConfig,
        connectToExternalService);

    externalService.onReconnectsExceeded(onReconnectsExceeded);

    await expectReply(externalService.connect()).resolves.toBeOk();
    await expect(connectToExternalService).toBeCalledTimes(1);

    // Successive calls don't call connectToExternalService again
    await expectReply(externalService.connect()).resolves.toBeOk();
    await expect(connectToExternalService).toBeCalledTimes(1);

    // The connection will be down for two reconnection timeouts
    await expectReply(externalService.fakeConnectionFailure()).resolves.toBeOk();
    expect(calledAfterReconnect).toBeCalledTimes(1);
});


test('Success then failure until max retries exceeded', async () => {
    jest.setTimeout(
        reconnectConfig.maxReconnects * reconnectConfig.reconnectTimeout
        + reconnectConfig.maxReconnects * 100
        + 500
    );

    const onReconnectsExceeded = jest.fn();
    const connectionErrStatus = errStatus('I am a failure.');
    const connectToExternalService = jest.fn()
        .mockImplementationOnce(() => connectionErrStatus)
        .mockImplementationOnce(() => okStatus('Connection successful'))
        .mockImplementation(() => connectionErrStatus);
    const externalService = new MockReconnectingClient(
        reconnectConfig,
        connectToExternalService);
    externalService.onReconnectsExceeded(onReconnectsExceeded);
    await expectReply(externalService.connect()).resolves.toBeOk();

    const afterConnection = jest.fn();
    externalService.fakeConnectionFailure().then(afterConnection);

    await wait(reconnectConfig.maxReconnects * reconnectConfig.reconnectTimeout);
    // Respect the code execution overhead.
    await wait(reconnectConfig.maxReconnects * 100);

    expect(onReconnectsExceeded).toBeCalledTimes(1);
    expect(onReconnectsExceeded).toBeCalledWith(connectionErrStatus);
    expect(connectToExternalService).toBeCalledTimes(reconnectConfig.maxReconnects + 3);
    expect(afterConnection).not.toBeCalled();
});
