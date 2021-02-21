import {errStatus, getOk, Reply, SerializedReply} from '@0cfg/reply-common/lib/Reply';
import {CommonReconnectingWebSocket} from '@0cfg/stubs-common/lib/messaging/CommonReconnectingWebSocket';
import {Sequential} from '@0cfg/utils-common/lib/Sequential';
import {CLIENT_CONTEXT_METHOD, HttpContext} from '../HttpContext';
import {WebSocketClientMessage} from './WebSocketClientMessage';
import {WebSocketServerMessage} from './WebSocketServerMessage';

export type MessageListener<ClientMessageT> = (message: ClientMessageT) => Promise<void>;
export type CompleteListener = (end: Reply) => Promise<void>;

export class InvalidJsonError extends Error {
    public constructor(message: string) {
        super(`The received websocket message is not a valid JSON string (Error message: ${message}).`);
    }
}

export const parse = <ServerMessageT>(
    data: string): WebSocketServerMessage<ServerMessageT> => {
    let message: WebSocketServerMessage<ServerMessageT>;
    try {
        message = JSON.parse(data);
    } catch (e) {
        throw new InvalidJsonError(e.message);
    }
    return message;
};

/**
 * Send an rpc client message via WebSocket.
 */
export const send =
    <ArgsType = unknown>(socket: CommonReconnectingWebSocket, message: WebSocketClientMessage<ArgsType>): Reply => {
        let serialized: any;
        try {
            serialized = JSON.stringify(message);
        } catch (e) {
            return errStatus(
                `The message is not serializable (Error message: ${e.message}).`);
        }
        if ([socket.CLOSING, socket.CLOSED].includes(socket.readyState)) {
            return errStatus('WebSocket is in a closing/closed state.');
        }
        try {
            socket.send(serialized);
        } catch (err) {
            return Reply.createFromError(err);
        }

        return getOk();
    };

export const setClientContext = <ContextT extends HttpContext>(
    socket: CommonReconnectingWebSocket, context: ContextT, requestIdSequential: Sequential): Promise<void> => {
    const requestId: number = requestIdSequential.next();
    const result = new Promise<void>((resolve) =>
        socket.onMessage(data => {
            const message = parse<SerializedReply>(data);
            message.requestId === requestId &&
            Reply.createFromSerializedReply(message.reply).throwIfError() &&
            resolve();
        })
    );
    send<ContextT>(socket, {
        method: CLIENT_CONTEXT_METHOD,
        requestId: requestId,
        args: context,
    });
    return result;
};
