import {ServerStreamStub} from '../stub/ServerStreamStub';
import {getOk} from '@0cfg/reply-common/lib/Reply';
import {CommonReconnectingWebSocket} from '@0cfg/stubs-common/lib/messaging/CommonReconnectingWebSocket';
import {Sequential} from '@0cfg/utils-common/lib/Sequential';
import {WebSocketStreamStub} from './WebSocketStreamStub';

export class WebSocketServerStreamStub<ClientMessageT, ServerMessageT>
    extends WebSocketStreamStub<ClientMessageT, ServerMessageT>
    implements ServerStreamStub<ClientMessageT, ServerMessageT> {

    public constructor(socket: CommonReconnectingWebSocket, requestIdSequential: Sequential, method: string) {
        super(socket, requestIdSequential, method);
    }

    public start(message: ClientMessageT): void {
        super.send(message);
        this.complete(getOk());
    }
}
