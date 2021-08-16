import {RequestReplyStub} from './RequestReplyStub';
import {BidiStreamStub} from './BidiStreamStub';
import {HttpContext} from '../HttpContext';
import {WebSocketRequestReplyStub} from '../websocket/WebSocketRequestReplyStub';
import {CommonReconnectingWebSocket} from '@0cfg/stubs-common/lib/messaging/CommonReconnectingWebSocket';
import {Sequential} from '@0cfg/utils-common/lib/Sequential';
import {WebSocketBidiStreamStub} from '../websocket/WebSocketBidiStreamStub';
import {HttpStatusCode} from '@0cfg/http-common/lib/HttpStatusCode';
import {setClientContext} from '../websocket/utils';
import {ServerStreamStub} from './ServerStreamStub';
import {WebSocketServerStreamStub} from '../websocket/WebSocketServerStreamStub';
import {HttpRequestReplyStub} from '../http/HttpRequestReplyStub';
import {NotImplementedError} from '@0cfg/utils-common/lib/NotImplementedError';
import {definedValues} from '@0cfg/utils-common/lib/definedValues';
import {execAll} from '@0cfg/utils-common/lib/execAll';
import {has} from '@0cfg/utils-common/lib/has';
import {ClientStreamStub} from "./ClientStreamStub";
import {WebSocketClientStreamStub} from "../websocket/WebSocketClientStreamStub";

export interface Endpoint<ContextT extends HttpContext> {
    requestReplyStub: RequestReplyStub,
    newBidiStreamStub: <ClientMessageT, ServerMessageT>(method: string)
        => BidiStreamStub<ClientMessageT, ServerMessageT>,
    newServerStreamStub: <ArgsT, ServerMessageT>(method: string)
        => ServerStreamStub<ArgsT, ServerMessageT>,
    newClientStreamStub: <ClientMessageT>(method: string) => ClientStreamStub<ClientMessageT>

    setClientContext(context: ContextT): Promise<void>;
}

export type ListenerRemovalFunction = () => void;

export class WebSocketEndpoint<ContextT extends HttpContext> implements Endpoint<ContextT> {

    public readonly requestReplyStub: RequestReplyStub;
    protected readonly socket: CommonReconnectingWebSocket;
    protected context: ContextT;
    protected readonly requestIdSequential: Sequential;
    protected connectionListeners: Record<number, () => void> = {};
    private readonly connectionListenerIdSequential;

    public constructor(socket: CommonReconnectingWebSocket) {
        this.socket = socket;
        this.requestIdSequential = new Sequential();
        this.connectionListenerIdSequential = new Sequential(0);
        this.context = {
            requestHeaders: {}, httpStatusCode: HttpStatusCode.Ok, responseHeaders: {},
        } as ContextT;
        this.requestReplyStub = new WebSocketRequestReplyStub(this.socket, this.requestIdSequential);
        this.socket.onClose(() => this.socket.resolveWhenConnected().then(
            async () => {
                if (has(this.context)) {
                    await setClientContext(this.socket, this.context, this.requestIdSequential);
                }
                execAll(definedValues(this.connectionListeners));
            }
        ));
    }

    public newBidiStreamStub<ClientMessageT, ServerMessageT>(method: string):
        BidiStreamStub<ClientMessageT, ServerMessageT> {
        return new WebSocketBidiStreamStub<ClientMessageT, ServerMessageT>(
            this.socket, this.requestIdSequential, method);
    }

    public newServerStreamStub<ArgsT, ServerMessageT>(method: string): ServerStreamStub<ArgsT, ServerMessageT> {
        return new WebSocketServerStreamStub<ArgsT, ServerMessageT>(this.socket, this.requestIdSequential, method);
    }

    public newClientStreamStub<ClientMessageT>(method: string): ClientStreamStub<ClientMessageT> {
        return new WebSocketClientStreamStub<ClientMessageT>(this.socket, this.requestIdSequential, method);
    }

    public setClientContext(context: ContextT): Promise<void> {
        this.context = context;
        return setClientContext(this.socket, context, this.requestIdSequential);
    }

    public onEachConnection(listener: () => void): ListenerRemovalFunction {
        const listenerId = this.connectionListenerIdSequential.next();
        this.connectionListeners[listenerId] = listener;
        return () => {
            delete this.connectionListeners[listenerId];
        };
    }
}

export class HttpAndWebSocketEndpoint<ContextT extends HttpContext> extends WebSocketEndpoint<ContextT> {

    public readonly requestReplyStub: HttpRequestReplyStub;

    public constructor(url: string, socket: CommonReconnectingWebSocket) {
        super(socket);
        this.requestReplyStub = new HttpRequestReplyStub<ContextT>(url);
    }

    public setClientContext(context: ContextT): Promise<void> {
        super.context = context;
        this.requestReplyStub.setClientContext(context);
        return setClientContext(this.socket, context, this.requestIdSequential);
    }
}

export class HttpEndpoint<ContextT extends HttpContext> implements Endpoint<ContextT> {
    public readonly requestReplyStub: HttpRequestReplyStub;

    public constructor(url: string) {
        this.requestReplyStub = new HttpRequestReplyStub<ContextT>(url);
    }

    public newBidiStreamStub<ClientMessageT, ServerMessageT>(method: string):
        BidiStreamStub<ClientMessageT, ServerMessageT> {
        throw new NotImplementedError();
    }

    public newServerStreamStub<ArgsT, ServerMessageT>(method: string):
        ServerStreamStub<ArgsT, ServerMessageT> {
        throw new NotImplementedError();
    }

    public newClientStreamStub<ClientMessageT>(method: string): ClientStreamStub<ClientMessageT> {
        throw new NotImplementedError();
    }

    public setClientContext(context: ContextT): Promise<void> {
        return this.requestReplyStub.setClientContext(context);
    }
}
