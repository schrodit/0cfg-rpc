import {ReplyPromise} from '@0cfg/reply-common/lib/Reply';
import {HttpContext} from '@0cfg/rpc-common/lib/HttpContext';

/**
 * Run before the service request was handled
 * Request handling will be canceled if the middleware returns a reply that is not ok
 */
export interface Middleware<ArgsT, MutableContextT extends HttpContext> {
    execute(args: ArgsT, context: MutableContextT): ReplyPromise<never>;
}
