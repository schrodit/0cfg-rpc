import {Middleware} from './Middleware';
import {HttpStatusCode} from '@0cfg/http-common/lib/HttpStatusCode';
import {errStatus, getOk, Reply} from '@0cfg/reply-common/lib/Reply';
import {HttpContext} from '@0cfg/rpc-common/lib/HttpContext';
import {injectable} from 'inversify';

@injectable()
export abstract class ArgsTypeCheckMiddleware<ArgsType, MutableContextType extends HttpContext>
    implements Middleware<ArgsType, MutableContextType> {

    private readonly argsClassName: string;

    protected constructor(argsClassName: string) {
        this.argsClassName = argsClassName;
    }

    public async execute(args: ArgsType, context: MutableContextType): Promise<Reply> {
        if (!this.isCorrectType(args)) {
            context.httpStatusCode = HttpStatusCode.BadRequest;
            return errStatus(`Bad arguments (requires ${this.argsClassName}).`);
        }

        return getOk();
    }

    protected abstract isCorrectType(args: ArgsType): args is ArgsType;
}
