import {RequestReplyService} from '../RequestReplyService';
import {HttpContext} from '@0cfg/rpc-common/lib/HttpContext';
import {okStatus, Reply, ReplyPromise} from '@0cfg/reply-common/lib/Reply';
import {Middleware} from '../Middleware';
import {HttpStatusCode} from '@0cfg/http-common/lib/HttpStatusCode';
import {has} from '@0cfg/utils-common/lib/has';

export type MockRequestReplyServiceArgs = { name: string };

export class MockRequestReplyService extends RequestReplyService<MockRequestReplyServiceArgs, string, HttpContext> {
    public lastArgs: MockRequestReplyServiceArgs | undefined;
    public calledNTimes: number = 0;
    private readonly name: string;
    private httpStatusCode: HttpStatusCode | undefined;

    public constructor(name: string, middleware?: Middleware<unknown, unknown>, httpStatusCode?: HttpStatusCode) {
        super();
        middleware && this.addMiddlewareToQueue(middleware);
        this.name = name;
        this.httpStatusCode = httpStatusCode;
    }

    public async execute(args: MockRequestReplyServiceArgs, context: HttpContext) {
        this.lastArgs = args;
        this.calledNTimes++;
        if (has(this.httpStatusCode)) {
            context.httpStatusCode = this.httpStatusCode;
        }
        return okStatus('Hi ' + args.name + '.');
    }

    public getName(): string {
        return this.name;
    }

    public reset(): void {
        this.calledNTimes = 0;
        this.lastArgs = undefined;
    }

}

export class MockMiddleware implements Middleware<unknown, HttpContext> {

    public calledNTimes = 0;
    public lastArgs: any = null;
    public lastContext: any = null;
    private readonly reply: Reply;
    private readonly httpStatusCode: HttpStatusCode;

    public constructor(reply: Reply, httpStatusCode: HttpStatusCode) {
        this.reply = reply;
        this.httpStatusCode = httpStatusCode;
    }

    public reset() {
        this.calledNTimes = 0;
        this.lastArgs = null;
        this.lastContext = null;
    }

    public async execute(args: unknown, context: unknown): ReplyPromise<never> {
        this.calledNTimes++;
        this.lastArgs = args;
        this.lastContext = context;
        return this.reply;
    }
}

