import {Sequential} from '@0cfg/utils-common/lib/Sequential';
import {CommonReconnectingWebSocket} from '@0cfg/stubs-common/lib/messaging/CommonReconnectingWebSocket';
import {ClientStreamStub} from '../stub/ClientStreamStub';
import {WebSocketStreamStub} from './WebSocketStreamStub';

export class WebSocketClientStreamStub<ClientMessageT> extends WebSocketStreamStub<ClientMessageT, never>
    implements ClientStreamStub<ClientMessageT> {

    public constructor(socket: CommonReconnectingWebSocket, requestIdSequential: Sequential, method: string) {
        super(socket, requestIdSequential, method);
    }

    public send(message: ClientMessageT): void {
        super.send(message);
    }
}