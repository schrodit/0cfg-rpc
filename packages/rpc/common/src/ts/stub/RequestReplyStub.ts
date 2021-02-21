import {ReplyPromise} from '@0cfg/reply-common/lib/Reply';
import {HttpContext} from '../HttpContext';

export interface RequestReplyStub<ContextType extends HttpContext = HttpContext> {
    execute<ReplyType, ArgsType>(method: string,
                                 args: ArgsType): ReplyPromise<ReplyType>;
}
