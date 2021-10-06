import {Service} from './Service';
import {HttpContext} from '@0cfg/rpc-common/lib/HttpContext';
import {Completer, Sender} from './streamTypes';
import {Reply} from '@0cfg/reply-common/lib/Reply';
import {has} from '@0cfg/utils-common/lib/has';
import {injectable} from 'inversify';

@injectable()
export abstract class ServerStreamService<ArgsT,
    ServerMessageT,
    MutableContextT extends HttpContext = HttpContext> extends Service<ArgsT, MutableContextT> {

    private completer: Completer | undefined;
    private sender: Sender<ServerMessageT> | undefined;

    protected constructor() {
        super();
    }

    public async init(context: MutableContextT): Promise<void> {
        // Override is optional
    }

    public abstract onCompleted(end: Reply): void;

    public abstract start(args: ArgsT, context: MutableContextT): void;

    public complete(end: Reply): void {
        if (!has(this.completer)) {
            throw new Error(`No completer set for ServerStreamService '${this.getName()}.`);
        }
        this.completer(end);
    }

    public send(message: ServerMessageT): void {
        if (!has(this.sender)) {
            throw new Error(`No sender set for ServerStreamService '${this.getName()}.`);
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


export interface ServerStreamServiceFactory<ArgsT,
    ServerMessageT,
    MutableContextT extends HttpContext = HttpContext> {

    create(): ServerStreamService<ArgsT, ServerMessageT, MutableContextT>

    getName(): string;
}

export const serverStreamFactory = <ArgsT, ReplyT, MutableContextT extends HttpContext>(
    name: string,
    create: () => ServerStreamService<ArgsT, ReplyT, MutableContextT>
) => {
    return new class {
        public create(): ServerStreamService<ArgsT, ReplyT, MutableContextT> {
            return create();
        }

        public getName(): string {
            return name;
        }
    };
};

export type AnyServerStreamServiceFactory<MutableContextT extends HttpContext> =
    ServerStreamServiceFactory<any, any, MutableContextT>;
export type AnyServerStreamService<MutableContextT extends HttpContext> =
    ServerStreamService<any, any, MutableContextT>;
