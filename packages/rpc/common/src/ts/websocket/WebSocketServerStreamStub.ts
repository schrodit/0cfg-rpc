import {ServerStreamStub} from '../stub/ServerStreamStub';
import {CommonReconnectingWebSocket} from '@0cfg/stubs-common/lib/messaging/CommonReconnectingWebSocket';
import {Sequential} from '@0cfg/utils-common/lib/Sequential';
import {WebSocketStreamStub} from './WebSocketStreamStub';
import {MessageListener} from "./utils";

export class WebSocketServerStreamStub<ClientMessageT, ServerMessageT>
    extends WebSocketStreamStub<ClientMessageT, ServerMessageT>
    implements ServerStreamStub<ClientMessageT, ServerMessageT> {

    private started: boolean = false;

    public constructor(socket: CommonReconnectingWebSocket, requestIdSequential: Sequential, method: string) {
        super(socket, requestIdSequential, method);
    }

    public start(message: ClientMessageT): void {
        if (this.started) {
            throw new Error('Trying to start a server stream that is already started.');
        }
        this.started = true;
        super.send(message);
    }


    public onMessage(listener: MessageListener<ServerMessageT>): void {
        super.onMessage(listener);
    }
}
