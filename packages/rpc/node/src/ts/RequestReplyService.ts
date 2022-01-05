import {Service} from './Service';
import {ReplyPromise} from '@0cfg/reply-common/lib/Reply';
import {HttpContext} from '@0cfg/rpc-common/lib/HttpContext';
import {injectable} from 'inversify';

/**
 * Service implementing the Request-response design pattern
 * (See: https://en.wikipedia.org/wiki/Request%E2%80%93response).
 * Note that this is intended to be used with {@link RpcServer}.
 */
@injectable()
export abstract class RequestReplyService<ArgsT, ReplyT, MutableContextT = HttpContext>
    extends Service<ArgsT, MutableContextT> {
    public abstract execute(args: ArgsT, context: MutableContextT): ReplyPromise<ReplyT>;
}

export type AnyRequestReplyService<Context extends HttpContext> = RequestReplyService<any, any, Context>;
