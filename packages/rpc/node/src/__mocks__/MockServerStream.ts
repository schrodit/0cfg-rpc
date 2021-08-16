import {getOk, Reply} from '@0cfg/reply-common/lib/Reply';
import {HttpContext} from '@0cfg/rpc-common/lib/HttpContext';
import {Middleware} from '../ts/Middleware';
import {has} from '@0cfg/utils-common/lib/has';
import {ServerStreamService} from '../ts/ServerStreamService';
import {milliSecondsInASecond} from '@0cfg/utils-common/lib/timeSpan';

export class MockServerStream extends ServerStreamService<'init', 'mock'> {
    private readonly name: string;

    public completed?: Reply;
    public receivedCount = 0;
    public sendCount = 0;
    private startedResolver?: () => void;
    private startedPromise = new Promise<void>(resolve => {
        this.startedResolver = resolve
    });
    public completePromise = new Promise<void>(resolve => {
        this.completeResolver = resolve;
    });
    private completeResolver?: (() => void);
    private sendInterval?: NodeJS.Timeout;

    public constructor(name: string, middleware: Middleware<unknown, unknown>) {
        super();
        this.name = name;
        this.addMiddlewareToQueue(middleware);
    }

    public getName(): string {
        return this.name;
    }

    public onCompleted(end: Reply): void {
        this.completed = end;
        has(this.completeResolver) && this.completeResolver();
    }

    public start(args: 'init', context: HttpContext): void {
        has(this.startedResolver) && this.startedResolver();
        this.sendInterval = setInterval(() => this.send('mock'), milliSecondsInASecond);
    }

    public started(): Promise<void> {
        return this.startedPromise;
    }

    public reset(): void {
        if (this.completed !== undefined) {
            this.complete(getOk());
        }
        has(this.sendInterval) && clearInterval(this.sendInterval);
        this.completePromise = new Promise<void>(resolve => {
            this.completeResolver = resolve
        });
        this.startedPromise = new Promise<void>(resolve => {
            this.startedResolver = resolve
        });
    }
}
