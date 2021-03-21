import {errStatus, getOk, Reply} from '@0cfg/reply-common/lib/Reply';
import {has} from '@0cfg/utils-common/lib/has';
import {
    CommonReconnectingWebSocket,
    NotYetConnectedError,
} from '@0cfg/stubs-common/lib/messaging/CommonReconnectingWebSocket';
import {ReconnectConfig} from '@0cfg/stubs-common/lib/ReconnectingClient';
import {milliSecondsInASecond} from '@0cfg/utils-common/lib/timeSpan';

/**
 * In ms
 */
const CONNECTION_TIMEOUT = 2 * milliSecondsInASecond;

/**
 * A Wrapper for WebSocket (compatible with the browser WebSocket interface) that automatically handles reconnection.
 * Only listeners added with {@link addEventListener} will still be receiving server messages after reconnects.
 */
export class ReconnectingWebSocket extends CommonReconnectingWebSocket implements WebSocket {
    public readonly url: string;
    public readonly CLOSED = WebSocket.CLOSED;
    public readonly CLOSING = WebSocket.CLOSING
    public readonly CONNECTING = WebSocket.CONNECTING;
    public readonly OPEN = WebSocket.OPEN;
    private readonly protocols: string | string[] | undefined;
    private readonly eventListeners:
        { [T in keyof WebSocketEventMap]: ((this: WebSocket, ev: any) => any)[] } = {
        'close': [],
        'error': [],
        'message': [],
        'open': [],
    };
    private socket: WebSocket | undefined;
    private wasClosed: boolean = false;

    /**
     * From https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
     * Note that this api differs from the WebSocket implementation in the way that {@link connect} needs to be called
     * to establish a connection.
     */
    public constructor(
        url: string,
        protocols?: string | string[],
        reconnectConfig: ReconnectConfig = {
            reconnectTimeout: 2000,
            maxReconnects: Number.MAX_SAFE_INTEGER,
        }) {
        super(reconnectConfig);
        this.url = url;
        this.protocols = protocols;
    }

    public get binaryType(): BinaryType {
        this.throwIfNotYetConnected();
        return this.socket!.binaryType;
    }

    public get bufferedAmount(): number {
        this.throwIfNotYetConnected();
        return this.socket!.bufferedAmount;
    }

    public get extensions(): string {
        this.throwIfNotYetConnected();
        return this.socket!.extensions;
    }

    /**
     * Stays set even after reconnects.
     */
    public set onclose(onclose: typeof WebSocket.prototype.onclose) {
        this.throwIfNotYetConnected();
        this.socket!.onclose = onclose;
    }

    /**
     * Stays set even after reconnects.
     */
    public get onclose(): typeof WebSocket.prototype.onclose {
        this.throwIfNotYetConnected();
        return this.socket!.onclose;
    }

    /**
     * Stays set even after reconnects.
     */
    public set onerror(onerror: typeof WebSocket.prototype.onerror) {
        this.throwIfNotYetConnected();
        this.socket!.onerror = onerror;
    }

    public get onerror(): typeof WebSocket.prototype.onerror {
        this.throwIfNotYetConnected();
        return this.socket!.onerror;
    }

    /**
     * Stays set even after reconnects.
     */
    public set onmessage(onmessage: typeof WebSocket.prototype.onmessage) {
        this.throwIfNotYetConnected();
        this.socket!.onmessage = onmessage;
    }

    public get onmessage(): typeof WebSocket.prototype.onmessage {
        this.throwIfNotYetConnected();
        return this.socket!.onmessage as typeof WebSocket.prototype.onmessage;
    }

    /**
     * Stays set even after reconnects.
     */
    public set onopen(onopen: typeof WebSocket.prototype.onopen) {
        this.throwIfNotYetConnected();
        this.socket!.onopen = onopen;
    }

    public get onopen(): typeof WebSocket.prototype.onopen {
        this.throwIfNotYetConnected();
        return this.socket!.onopen;
    }

    public get readyState(): number {
        this.throwIfNotYetConnected();
        return this.socket!.readyState;
    }

    public get protocol(): string {
        this.throwIfNotYetConnected();
        return this.socket!.protocol;
    }

    public close(code ?: number, reason ?: string):
        void {
        this.wasClosed = true;
        this.socket?.close(code, reason);
    }

    public dispatchEvent(event: Event): boolean {
        this.waitForConnection().then(() =>
            this.socket!.dispatchEvent(event));
        return true;
    }

    public send(data: string | ArrayBufferLike | Blob | ArrayBufferView):
        void {
        this.waitForConnection().then(() => this.socket!.send(data));
    }

    /**
     * Will still be added, even after reconnects.
     * Make sure to remove the listener again if you don't need it anymore ({@link removeEventListener}).
     */
    public addEventListener<K extends keyof WebSocketEventMap>(
        type: K,
        listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions): void {
        this.eventListeners[type].push(listener);
        this.waitForConnection().then(() =>
            this.socket!.addEventListener(type, listener, options));
    }

    public removeEventListener<K extends keyof WebSocketEventMap>(
        type: K,
        listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
        options?: boolean | EventListenerOptions): void {
        this.eventListeners[type] = this.eventListeners[type].filter(e => e !== listener);
        this.waitForConnection().then(() => this.socket?.removeEventListener(type, listener, options));
    }

    public onMessage(listener: (data: string) => void): void {
        this.addEventListener('message', (ev: MessageEvent) => listener(ev.data));
    }

    public onClose(listener: (message: string) => void): void {
        super.resolveWhenConnected().then(() => this.socket?.addEventListener('close', (ev) => listener(ev.reason)));
    }

    protected connectToExternalService(): Promise<Reply> {
        return new Promise<Reply>(resolve => {
            const onclose = this.socket ? this.socket.onclose : null;
            const onmessage = this.socket ? this.socket.onmessage : null;
            const onerror = this.socket ? this.socket.onerror : null;
            const onopen = this.socket ? this.socket.onopen : null;

            delete this.socket;
            this.socket = new WebSocket(this.url, this.protocols);

            this.socket.onclose = onclose;
            this.socket.onmessage = onmessage;
            this.socket.onerror = onerror;
            this.socket.onopen = onopen;

            const timeout = setTimeout(
                () => {
                    this.socket?.close();
                    resolve(errStatus('Connection timed out.'));
                },
                CONNECTION_TIMEOUT
            );
            this.socket.addEventListener('open', () => {
                clearTimeout(timeout);
                for (const eventType in this.eventListeners) {
                    this.eventListeners[eventType as keyof WebSocketEventMap]
                        .forEach(listener => this.socket?.addEventListener(eventType, listener));
                }
                resolve(getOk());
            });
            this.socket.addEventListener('close',
                (ev: CloseEvent) => {
                    if (super.isConnected() && !this.wasClosed && !ev.wasClean && has(ev.reason)) {
                        super.onDisconnect(errStatus(ev.reason));
                    }
                });
            this.socket.addEventListener('error', (ev: Event) => {
                clearTimeout(timeout);
                resolve(errStatus(`Host unreachable. ${JSON.stringify(ev)}.`));
            });
        });

    }

    private async waitForConnection(): Promise<void> {
        if (!super.isConnected()) {
            await super.resolveWhenConnected();
        }
    }

    private throwIfNotYetConnected(): void {
        if (!has(this.socket)) {
            throw new NotYetConnectedError();
        }
    }

}
