import {BidiStreamService} from '../BidiStreamService';
import {getOk, Reply} from '@0cfg/reply-common/lib/Reply';
import {HttpContext} from '@0cfg/rpc-common/lib/HttpContext';
import {Middleware} from '../Middleware';
import {has} from '@0cfg/utils-common/lib/has';

export class MockBidiStream extends BidiStreamService<'ping', 'pong'> {
    private readonly name: string;

    public completed?: Reply;
    public receivedCount = 0;
    public sendCount = 0;
    public completePromise = new Promise<void>(resolve => {
        this.resolve = resolve;
    });
    private resolve?: (() => void);

    public constructor(name: string, middleware?: Middleware<unknown, HttpContext>) {
        super();
        this.name = name;
        has(middleware) && this.addMiddlewareToQueue(middleware);
    }

    public getName(): string {
        return this.name;
    }

    public onCompleted(end: Reply): void {
        this.completed = end;
        has(this.resolve) && this.resolve();
    }

    public onMessage(message: 'ping', context: HttpContext): void {
        this.receivedCount++;
        this.send('pong');
        this.sendCount++;
    }

    public reset() {
        this.receivedCount = 0;
        this.sendCount = 0;
        if (this.completed !== undefined) {
            this.complete(getOk());
        }
        this.completed = undefined;
    }

}
