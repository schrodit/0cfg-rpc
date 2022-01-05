import {BidiStreamService} from '../BidiStreamService';
import {getOk, Reply} from '@0cfg/reply-common/lib/Reply';
import {HttpContext} from '@0cfg/rpc-common/lib/HttpContext';
import {Middleware} from '../Middleware';
import {has} from '@0cfg/utils-common/lib/has';
import {ServerStreamService} from '../ServerStreamService';
import {milliSecondsInASecond} from '@0cfg/utils-common/lib/timeSpan';

export class MockServerStream extends ServerStreamService<'init', 'mock'> {
    private readonly name: string;

    public completed?: Reply;
    public receivedCount = 0;
    public sendCount = 0;
    public completePromise = new Promise<void>(resolve => {
        this.resolve = resolve;
    });
    private resolve?: (() => void);

    public constructor(name: string, middleware: Middleware<unknown, HttpContext>) {
        super();
        this.name = name;
        this.addMiddlewareToQueue(middleware);
    }

    public getName(): string {
        return this.name;
    }

    public onCompleted(end: Reply): void {
        this.completed = end;
        has(this.resolve) && this.resolve();
    }

    public start(args: 'init', context: HttpContext): void {
        setInterval(() => this.send('mock'), milliSecondsInASecond);
    }
}
