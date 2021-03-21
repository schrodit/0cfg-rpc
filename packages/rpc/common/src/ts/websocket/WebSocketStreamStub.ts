import {CommonReconnectingWebSocket} from '@0cfg/stubs-common/lib/messaging/CommonReconnectingWebSocket';
import {Sequential} from '@0cfg/utils-common/lib/Sequential';
import {errStatus, Reply, SerializedReply} from '@0cfg/reply-common/lib/Reply';
import {CompleteListener, MessageListener, parse, send} from './utils';
import {COMPLETE_METHOD} from '../stub/reservedRpcMethods';
import {has} from '@0cfg/utils-common/lib/has';

export abstract class WebSocketStreamStub<ClientMessageT, ServerMessageT> {
    protected readonly socket: CommonReconnectingWebSocket;
    protected readonly method: string;
    protected readonly requestId: number;

    protected completed: boolean = false;
    protected readonly messageListeners: MessageListener<ServerMessageT>[] = [];
    protected readonly completeListeners: CompleteListener[] = [];
    protected readonly messageListener: (data: string) => void;

    public constructor(socket: CommonReconnectingWebSocket, requestIdSequential: Sequential, method: string) {
        this.socket = socket;
        this.method = method;
        this.requestId = requestIdSequential.next();

        this.socket.onClose(message => {
            this.completed = true;
            this.completeListeners.forEach(listener => listener(errStatus(message)));
            this.socket.removeEventListener('message', this.messageListener);
        });
        this.messageListener = (data) => this.parseAndForwardServerMessage(data);
        this.socket.onMessage(this.messageListener);
    }

    public onCompleted(listener: CompleteListener): void {
        this.completeListeners.push(listener);
    }

    public onMessage(listener: MessageListener<ServerMessageT>): void {
        this.messageListeners.push(listener);
    }

    public complete(end: Reply): void {
        send<SerializedReply>(this.socket, {
            requestId: this.requestId,
            method: COMPLETE_METHOD,
            args: end.toSerializedReply(),
        });
    }

    protected send(message: ClientMessageT): void {
        if (this.completed) {
            throw new Error(`Can not send messages on a completed bidi stream (requestId: ${this.requestId}).`);
        }

        send(this.socket, {
            requestId: this.requestId,
            method: this.method,
            args: message,
        });
    }

    private parseAndForwardServerMessage(data: string): void {
        const message = parse<ServerMessageT | SerializedReply>(data);
        if (message.requestId !== this.requestId) {
            return;
        }
        if (has(message.complete) && message.complete) {
            const reply = Reply.createFromSerializedReply(message.reply as SerializedReply);
            this.completed = true;
            this.completeListeners.forEach(listener => listener(reply));
            this.socket.removeEventListener('message', this.messageListener);
        } else {
            this.messageListeners.forEach(listener => listener(message.reply as ServerMessageT));
        }
    }
}