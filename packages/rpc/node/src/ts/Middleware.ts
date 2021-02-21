import {ReplyPromise} from '@0cfg/reply-common/lib/Reply';

export interface Middleware<ArgsT, MutableContextT> {
    execute(args: ArgsT, context: MutableContextT): ReplyPromise<never>;
}
