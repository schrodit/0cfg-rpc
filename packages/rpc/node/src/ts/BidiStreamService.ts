import {Service} from './Service';
import {Reply} from '@0cfg/reply-common/lib/Reply';
import {has} from '@0cfg/utils-common/lib/has';
import {HttpContext} from '@0cfg/rpc-common/lib/HttpContext';
import {injectable} from 'inversify';
import {Completer, Sender} from './streamTypes';

@injectable()
export abstract class BidiStreamService<ClientMessageT,
    ServerMessageT,
    MutableContextT extends HttpContext = HttpContext> extends Service<ClientMessageT, MutableContextT> {

    private completer: Completer | undefined;
    private sender: Sender<ServerMessageT> | undefined;

    protected constructor() {
        super();
    }

    public async init(context: MutableContextT): Promise<void> {
        // Override is optional
    }

    public abstract onCompleted(end: Reply): void;

    public abstract onMessage(message: ClientMessageT, context: MutableContextT): void;

    public complete(end: Reply): void {
        if (!has(this.completer)) {
            throw new Error(`No completer set for BidiStreamService '${this.getName()}.`);
        }
        this.completer(end);
    }

    public send(message: ServerMessageT): void {
        if (!has(this.sender)) {
            throw new Error(`No sender set for BidiStreamService '${this.getName()}.`);
        }
        this.sender(message);
    }

    public setCompleter(completer: Completer): void {
        this.completer = completer;
    }

    public setSender(sender: Sender<ServerMessageT>): void {
        this.sender = sender;
    }
}

export interface BidiStreamServiceFactory<ClientMessageT,
    ServerMessageT,
    MutableContextT extends HttpContext = HttpContext> {

    create(): BidiStreamService<ClientMessageT, ServerMessageT, MutableContextT>

    getName(): string;
}

export const bidiStreamFactory = <ArgsT, ReplyT, MutableContextT extends HttpContext>(
    name: string,
    create: () => BidiStreamService<ArgsT, ReplyT, MutableContextT>
) => {
    return new class {
        public create(): BidiStreamService<ArgsT, ReplyT, MutableContextT> {
            return create();
        }

        public getName(): string {
            return name;
        }
    };
};

export type AnyBidiStreamServiceFactory<MutableContextT extends HttpContext> =
    BidiStreamServiceFactory<any, any, MutableContextT>;
export type AnyBidiStreamService<MutableContextT extends HttpContext> =
    BidiStreamService<any, any, MutableContextT>;
