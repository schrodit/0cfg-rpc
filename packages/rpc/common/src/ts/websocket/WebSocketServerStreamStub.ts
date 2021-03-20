import {ServerStreamStub} from '../stub/ServerStreamStub';
import {errStatus, getOk, Reply, SerializedReply} from '@0cfg/reply-common/lib/Reply';
import {CommonReconnectingWebSocket} from '@0cfg/stubs-common/lib/messaging/CommonReconnectingWebSocket';
import {Sequential} from '@0cfg/utils-common/lib/Sequential';
import {CompleteListener, MessageListener, parse, send} from './utils';
import {COMPLETE_METHOD} from '../stub/reservedRpcMethods';
import {has} from '@0cfg/utils-common/lib/has';

export class WebSocketServerStreamStub<ClientMessageT, ServerMessageT>
    implements ServerStreamStub<ClientMessageT, ServerMessageT> {

    private completed: boolean = false;
    private readonly socket: CommonReconnectingWebSocket;
    private readonly requestId: number;
    private readonly method: string;
    private readonly messageListeners: MessageListener<ServerMessageT>[] = [];
    private readonly completeListeners: CompleteListener[] = [];
    private readonly messageListener: (data: string) => void;

    public constructor(socket: CommonReconnectingWebSocket, requestIdSequential: Sequential, method: string) {
        this.socket = socket;
        this.method = method;
        this.socket.onClose(message => {
            this.completed = true;
            this.completeListeners.forEach(listener => listener(errStatus(message)));
            this.socket.removeEventListener('message', this.messageListener);
        });
        this.messageListener = data => this.parseAndForwardServerMessage(data);
        this.socket.onMessage(this.messageListener);
        this.requestId = requestIdSequential.next();
    }

    public complete(end: Reply): void {
        send<SerializedReply>(this.socket, {
            requestId: this.requestId!,
            method: COMPLETE_METHOD,
            args: end.toSerializedReply(),
        });
    }

    public start<ArgsT>(message: ArgsT): void {
        if (this.completed) {
            throw new Error(`Can not send messages on a completed server stream (requestId: ${this.requestId}).`);
        }
        send(this.socket, {
            requestId: this.requestId,
            method: this.method,
            args: message,
        });
        this.complete(getOk());
    }

    public onCompleted(listener: CompleteListener): void {
        this.completeListeners.push(listener);
    }

    public onMessage(listener: MessageListener<ServerMessageT>): void {
        this.messageListeners.push(listener);
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
