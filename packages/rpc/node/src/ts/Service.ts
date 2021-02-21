import 'reflect-metadata';
import {getOk, Reply, ReplyPromise} from '@0cfg/reply-common/lib/Reply';
import {Middleware} from './Middleware';
import {injectable} from 'inversify';
import {has} from '@0cfg/utils-common/lib/has';

@injectable()
export abstract class Service<ArgsT, MutableContextT> {
    private middlewareQueue: Middleware<ArgsT, MutableContextT>[] = [];

    public abstract getName(): string;

    public async runMiddleware(args: ArgsT, context: MutableContextT): ReplyPromise<string> {
        for (const middleware of this.middlewareQueue) {
            let validation;
            try {
                validation = await middleware.execute(args, context);
            } catch (e) {
                return Reply.createFromError(e);
            }
            if (!validation.ok()) {
                return validation;
            }
        }
        return getOk();
    }

    protected addMiddlewareToQueue(...middleware: Middleware<ArgsT, MutableContextT>[]): void {
        this.middlewareQueue.push(...middleware);
    }

    protected insertMiddlewareBeforeQueue(...middleware: Middleware<ArgsT, MutableContextT>[]): void {
        this.middlewareQueue.unshift(...middleware);
    }

}

