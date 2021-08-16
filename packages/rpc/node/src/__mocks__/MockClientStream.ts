import {ClientStreamService} from "../ts/ClientStreamService";
import {getOk, Reply} from "@0cfg/reply-common/lib/Reply";
import {HttpContext} from "@0cfg/rpc-common/lib/HttpContext";
import {Middleware} from "../ts/Middleware";
import {has} from "@0cfg/utils-common/lib/has";

export class MockClientStream extends ClientStreamService<'ping'> {
    private readonly name: string;

    public completed?: Reply;
    public receivedCount = 0;
    private startedResolver?: () => void;
    private startedPromise = new Promise<void>(resolve => {
        this.startedResolver = resolve
    });
    private expectedMessages: number = 0;
    public completePromise = new Promise<void>(resolve => {
        this.completeResolver = resolve;
    });
    private completeResolver?: (() => void);
    public receivedPromise = new Promise<void>(resolve => {
        this.receivedResolver = resolve;
    });
    private receivedResolver?: (() => void);

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

    public onMessage(message: 'ping', context: HttpContext): void {
        console.log(this.receivedCount);
        if (++this.receivedCount === this.expectedMessages) {
            has(this.receivedResolver) && this.receivedResolver();
        }
    }

    public setExpectedMessages(expectedMessages: number): this {
        this.expectedMessages = expectedMessages;
        return this;
    }

    public reset(): void {
        this.receivedCount = 0;
        if (this.completed !== undefined) {
            this.complete(getOk());
        }
        this.completePromise = new Promise<void>(resolve => {
            this.completeResolver = resolve
        });
        this.startedPromise = new Promise<void>(resolve => {
            this.startedResolver = resolve
        });
        this.receivedPromise = new Promise<void>(resolve => {
            this.receivedResolver = resolve;
        });
    }


}
