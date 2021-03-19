import {ReconnectingClient} from '../ReconnectingClient';

/**
 * Thrown if a method which requires a connected websocket was invoked on a {@link CommonReconnectingWebSocket}.
 */
export class NotYetConnectedError extends Error {
    public constructor() {
        super('The WebSocket was not yet connected. Use connect() to connect the WebSocket.');
    }
}

/**
 * Generic facade for automatically reconnecting WebSocket clients.
 */
export abstract class CommonReconnectingWebSocket extends ReconnectingClient {

    /**
     * WebSocket connection state values.
     */
    public abstract CLOSED: number;
    public abstract CLOSING: number;
    public abstract CONNECTING: number;
    public abstract OPEN: number;

    /**
     * Returns current connection state.
     */
    public abstract readyState: number;

    /**
     * Send a WebSocket message to the server.
     */
    public abstract send(data: string): void;

    /**
     * Attach a listener to receive a message from the server.
     */
    public abstract onMessage(listener: (data: string) => void): void;

    public abstract removeEventListener(type: string, listener: (this: any, ev: any) => any): void;

    /**
     * Attach a listener which is invoked on close of the ws.
     */
    public abstract onClose(listener: (message: string) => void): void;
}
