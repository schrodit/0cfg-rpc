import {BidiStreamStub} from '../stub/BidiStreamStub';
import {CommonReconnectingWebSocket} from '@0cfg/stubs-common/lib/messaging/CommonReconnectingWebSocket';
import {Sequential} from '@0cfg/utils-common/lib/Sequential';
import {send} from './utils';
import {WebSocketStreamStub} from "./WebSocketStreamStub";

export class WebSocketBidiStreamStub<ClientMessageT, ServerMessageT>
    extends WebSocketStreamStub<ServerMessageT> implements BidiStreamStub<ClientMessageT, ServerMessageT> {

    public constructor(socket: CommonReconnectingWebSocket, requestIdSequential: Sequential, method: string) {
        super(socket, requestIdSequential, method);
    }

    public send(message: ClientMessageT, method?: string): void {
        if (this.completed) {
            throw new Error(`Can not send messages on a completed bidi stream (requestId: ${this.requestId}).`);
        }

        send(this.socket, {
            requestId: this.requestId,
            method: this.method,
            args: message,
        });
    }
}
