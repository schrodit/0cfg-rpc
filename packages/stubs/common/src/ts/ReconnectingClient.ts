import {errStatus, okReply, okStatus, Reply, Status} from '@0cfg/reply-common/lib/Reply';
import {has} from '@0cfg/utils-common/lib/has';
import {wait} from '@0cfg/utils-common/lib/wait';

export interface ReconnectConfig {
    /**
     * Amount of failing reconnects before no further reconnects are attempted.
     * Once a connection is established successfully the budget of failing reconnects is reset to the starting value.
     */
    maxReconnects: number;
    /**
     * Delay between successive reconnects in milliseconds.
     */
    reconnectTimeout: number;
}

export abstract class ReconnectingClient {

    private readonly maxReconnects: number;
    private readonly reconnectTimeout: number;
    private connectionListeners: ((reply: Reply) => void)[] = [];
    private connecting: boolean = false;
    private connected: boolean = false;
    private reconnectCounter: number = 0;
    private readonly reconnectsExceededListeners: ((reply: Reply) => void)[] = [];

    /**
     * @param onReconnectsExceeded Will be called once the number of reconnection attempts exceeds
     *     the max reconnects ({@link ReconnectConfig.maxReconnects}) given in {@param config}.
     * @param config {@see ReconnectConfig}
     */
    protected constructor(config: ReconnectConfig) {
        this.maxReconnects = config.maxReconnects;
        this.reconnectTimeout = config.reconnectTimeout;
    }

    /**
     * Only resolves once this service is connected successfully.
     * This method does nothing and resolves immediately if the service is already in the progress of establishing a
     * connection or has already established a connection successfully in the past.
     *
     * @return The return value of {@link resolveWhenConnected}.
     */
    public connect(): Promise<Reply> {
        if (!this.connected && !this.connecting) {
            this.connecting = true;
            (async (): Promise<void> => {
                let connectionStatus: Reply | undefined;
                while (
                    (!has(connectionStatus) || connectionStatus.notOk())
                    && this.reconnectCounter < this.maxReconnects) {
                    if (has(connectionStatus)) {
                        connectionStatus.log();
                        okReply(`Reconnecting to external service... (attempts left: ${this.maxReconnects -
                        this.reconnectCounter})`).log();
                        this.reconnectCounter++;
                        await wait(this.reconnectTimeout);
                    }

                    connectionStatus = await this.connectToExternalService();
                }

                if (this.reconnectCounter >= this.maxReconnects) {
                    this.connected = false;
                    this.connecting = false;
                    this.reconnectsExceededListeners.forEach(listener => listener(connectionStatus!));
                    return;
                }

                this.connected = true;
                this.connecting = false;
                this.reconnectCounter = 0;
                if (has(connectionStatus)) {
                    okStatus('Connection to external service established successfully.').log();
                    this.fireConnectionListeners(connectionStatus);
                }
            })();
        }

        return this.resolveWhenConnected();
    }

    /**
     * @return A promise that resolves once the connection to the external service is established. The return value
     *     will always resolve to a successful status.
     */
    public async resolveWhenConnected(): Promise<Reply> {
        if (this.connected) {
            return Reply.getOk();
        }
        return new Promise<Reply>(resolve => this.connectionListeners.push(resolve));
    }

    public onReconnectsExceeded(listener: (reply: Reply) => void): void {
        this.reconnectsExceededListeners.push(listener);
    }

    protected isConnected(): boolean {
        return this.connected;
    }

    /**
     * This method must be called by the implementing class whenever the external service disconnects.
     * It will reconnect to the external service.
     *
     * @param reason An error status explaining the reason for the disconnect.
     * @return The return value of {@link resolveWhenConnected}.
     */
    protected onDisconnect(reason: Reply<never, Status.Error>): Promise<Reply<never, Status.Error>> {
        if (!this.connecting) {
            reason.log();
            errStatus('Connection lost. Starting to reconnect...').log();
        }
        this.connected = false;
        return this.connect();
    }

    /**
     * Will be called at least once and at most {@code {@link this.maxReconnects} + 1} times.
     */
    protected abstract connectToExternalService(): Promise<Reply>;

    private fireConnectionListeners(connectionStatus: Reply<never>): void {
        this.connectionListeners.forEach((resolve) => resolve(connectionStatus));
        this.connectionListeners = [];
    }
}