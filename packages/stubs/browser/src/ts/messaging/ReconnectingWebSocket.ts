import {getOk, Reply, errStatus} from '@0cfg/reply-common/lib/Reply';
import {has} from '@0cfg/utils-common/lib/has';
import {NotYetConnectedError, CommonReconnectingWebSocket}
    from '@0cfg/stubs-common/lib/messaging/CommonReconnectingWebSocket';
import {ReconnectConfig} from '@0cfg/stubs-common/lib/ReconnectingClient';

/**
 * A Wrapper for WebSocket (compatible with the browser WebSocket interface) that automatically handles reconnection.
 */
export class ReconnectingWebSocket extends CommonReconnectingWebSocket implements WebSocket {
    public readonly url: string;
    public readonly CLOSED = WebSocket.CLOSED;
    public readonly CLOSING = WebSocket.CLOSING
    public readonly CONNECTING = WebSocket.CONNECTING;
    public readonly OPEN = WebSocket.OPEN;
    private readonly protocols: string | string[] | undefined;
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

    public set onclose(onclose: typeof WebSocket.prototype.onclose) {
        this.throwIfNotYetConnected();
        this.socket!.onclose = onclose;
    }

    public get onclose(): typeof WebSocket.prototype.onclose {
        this.throwIfNotYetConnected();
        return this.socket!.onclose;
    }

    public set onerror(onerror: typeof WebSocket.prototype.onerror) {
        this.throwIfNotYetConnected();
        this.socket!.onerror = onerror;
    }

    public get onerror(): typeof WebSocket.prototype.onerror {
        this.throwIfNotYetConnected();
        return this.socket!.onerror;
    }

    public set onmessage(onmessage: typeof WebSocket.prototype.onmessage) {
        this.throwIfNotYetConnected();
        this.socket!.onmessage = onmessage;
    }

    public get onmessage(): typeof WebSocket.prototype.onmessage {
        this.throwIfNotYetConnected();
        return this.socket!.onmessage as typeof WebSocket.prototype.onmessage;
    }

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

    public dispatchEvent(event: Event):
        boolean {
        this.waitForConnection().then(() =>
            this.socket!.dispatchEvent(event));
        return true;
    }


    public send(data: string | ArrayBufferLike | Blob | ArrayBufferView):
        void {
        this.waitForConnection().then(() => this.socket!.send(data));
    }

    protected connectToExternalService(): Promise<Reply> {
        return new Promise<Reply>(resolve => {
            delete this.socket;
            this.socket = new WebSocket(this.url, this.protocols);
            this.socket.addEventListener('open', () => resolve(getOk()));
            this.socket.addEventListener('close',
                (ev: CloseEvent) => {
                    if (this.isConnected() && !this.wasClosed && !ev.wasClean && has(ev.reason)) {
                        this.onDisconnect(errStatus(ev.reason));
                    }
                });
            this.socket.addEventListener('error', (ev: Event) => {
                resolve(errStatus('Host unreachable.'));
            });
        });

    }

    public addEventListener<K extends keyof WebSocketEventMap>(
        type: K,
        listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions): void {
        this.waitForConnection().then(() =>
            this.socket!.addEventListener(type, listener, options));
    }

    public onMessage(listener: (data: string) => void): void {
        this.addEventListener('message', (ev: MessageEvent) => listener(ev.data));
    }

    public onClose(listener: (message: string) => void): void {
        this.resolveWhenConnected().then(() => this.socket?.addEventListener('close', (ev) => listener(ev.reason)));
    }

    public removeEventListener<K extends keyof WebSocketEventMap>(
        type: K,
        listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
        options?: boolean | EventListenerOptions): void {
        this.waitForConnection().then(() => this.socket?.removeEventListener(type, listener, options));
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
