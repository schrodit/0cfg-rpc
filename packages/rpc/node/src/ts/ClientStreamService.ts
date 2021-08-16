import {Service} from './Service';
import {HttpContext} from '@0cfg/rpc-common/lib/HttpContext';
import {Completer, Sender} from './streamTypes';
import {Reply} from '@0cfg/reply-common/lib/Reply';
import {has} from '@0cfg/utils-common/lib/has';

export abstract class ClientStreamService<MessageT, MutableContextT extends HttpContext = HttpContext> extends Service<MessageT, MutableContextT> {

    private completer: Completer | undefined;

    protected constructor() {
        super();
    }

    public async init(context: MutableContextT): Promise<void> {
        // Override is optional
    }

    public abstract onCompleted(end: Reply): void;

    public abstract onMessage(args: MessageT, context: MutableContextT): void;

    public complete(end: Reply): void {
        if (!has(this.completer)) {
            throw new Error(`No completer set for ClientStreamService '${this.getName()}.`);
        }
        this.completer(end);
    }

    public setCompleter(completer: Completer): void {
        this.completer = completer;
    }
}


export interface ClientStreamServiceFactory<ClientMessageT, MutableContextT extends HttpContext = HttpContext> {

    create(): ClientStreamService<ClientMessageT, MutableContextT>

    getName(): string;
}

export const clientStreamFactory = <ClientMessageT, MutableContextT extends HttpContext>(
    name: string,
    create: () => ClientStreamService<ClientMessageT, MutableContextT>
) => {
    return new class {
        public create(): ClientStreamService<ClientMessageT, MutableContextT> {
            return create();
        }

        public getName(): string {
            return name;
        }
    };
};

export type AnyClientStreamServiceFactory<MutableContextT extends HttpContext> =
    ClientStreamServiceFactory<any, MutableContextT>;
export type AnyClientStreamService<MutableContextT extends HttpContext> =
    ClientStreamService<any, MutableContextT>;
