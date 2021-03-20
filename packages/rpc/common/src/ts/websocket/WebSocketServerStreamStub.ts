import {ServerStreamStub} from '../stub/ServerStreamStub';
import {getOk} from '@0cfg/reply-common/lib/Reply';
import {CommonReconnectingWebSocket} from '@0cfg/stubs-common/lib/messaging/CommonReconnectingWebSocket';
import {Sequential} from '@0cfg/utils-common/lib/Sequential';
import {send} from './utils';
import {WebSocketStreamStub} from './WebSocketStreamStub';

export class WebSocketServerStreamStub<ClientMessageT, ServerMessageT>
    extends WebSocketStreamStub<ServerMessageT>
    implements ServerStreamStub<ClientMessageT, ServerMessageT> {

    public constructor(socket: CommonReconnectingWebSocket, requestIdSequential: Sequential, method: string) {
        super(socket, requestIdSequential, method);
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
}
