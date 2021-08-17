import {BidiStreamStub} from '../stub/BidiStreamStub';
import {CommonReconnectingWebSocket} from '@0cfg/stubs-common/lib/messaging/CommonReconnectingWebSocket';
import {Sequential} from '@0cfg/utils-common/lib/Sequential';
import {WebSocketStreamStub} from './WebSocketStreamStub';
import {MessageListener} from './utils';

export class WebSocketBidiStreamStub<ClientMessageT, ServerMessageT>
    extends WebSocketStreamStub<ClientMessageT, ServerMessageT>
    implements BidiStreamStub<ClientMessageT, ServerMessageT> {

    public constructor(socket: CommonReconnectingWebSocket, requestIdSequential: Sequential, method: string) {
        super(socket, requestIdSequential, method);
    }

    public send(message: ClientMessageT): void {
        super.send(message);
    }

    public onMessage(listener: MessageListener<ServerMessageT>): void {
        super.onMessage(listener);
    }
}
