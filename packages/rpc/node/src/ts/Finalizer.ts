import {Reply} from '@0cfg/reply-common/lib/Reply';
import {HttpContext} from '@0cfg/rpc-common/lib/HttpContext';

/**
 * Run after a request reply service request was handled (no matter if successfully or not).
 * An error will be send to the client if the finalizer returns a reply that is not ok.
 */
export interface Finalizer<ArgsT, MutableContextT extends HttpContext> {
    execute(args: ArgsT, context: MutableContextT, serviceReply: Reply<unknown>): Promise<Reply>;
}
