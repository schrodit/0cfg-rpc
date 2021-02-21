import {ServerStreamStub} from '../stub/ServerStreamStub';
import {errStatus, getOk, Reply, SerializedReply} from '@0cfg/reply-common/lib/Reply';
import {CommonReconnectingWebSocket} from '@0cfg/stubs-common/lib/messaging/CommonReconnectingWebSocket';
import {Sequential} from '@0cfg/utils-common/lib/Sequential';
import {CompleteListener, MessageListener, parse, send} from './utils';
import {COMPLETE_METHOD} from '../stub/reservedRpcMethods';
import {has} from '@0cfg/utils-common/lib/has';
import {execAll} from '@0cfg/utils-common/lib/execAll';

export class WebSocketServerStreamStub<ClientMessageT, ServerMessageT>
    implements ServerStreamStub<ClientMessageT, ServerMessageT> {

    private readonly socket: CommonReconnectingWebSocket;
    private requestId: number | undefined;
    private readonly method: string;
    private readonly messageListeners: MessageListener<ServerMessageT>[] = [];
    private readonly completeListeners: CompleteListener[] = [];
    private readonly sequential: Sequential;

    public constructor(socket: CommonReconnectingWebSocket, requestIdSequential: Sequential, method: string) {
        this.socket = socket;
        this.sequential = requestIdSequential;
        this.method = method;
        this.socket.onClose(message =>
            this.completeListeners.forEach(listener =>
                listener(errStatus(message))));
        this.socket.onMessage(data => this.parseAndForwardServerMessage(data));
    }

    public complete(end: Reply): void {
        send<SerializedReply<never>>(this.socket, {
            requestId: this.requestId!,
            method: COMPLETE_METHOD,
            args: end.toSerializedReply(),
        });
        this.requestId = undefined;
    }

    public onCompleted(listener: CompleteListener): void {
        this.completeListeners.push(listener);
    }

    public onMessage(listener: MessageListener<ServerMessageT>): void {
        this.messageListeners.push(listener);
    }

    public start<ArgsT>(message: ArgsT): void {
        if (has(this.requestId)) {
            this.complete(getOk());
        }
        this.requestId = this.sequential.next();
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
            this.completeListeners.forEach(listener => listener(reply));
        } else {
            this.messageListeners.forEach(listener => listener(message.reply as ServerMessageT));
        }
    }

}
