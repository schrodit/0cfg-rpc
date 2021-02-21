import fetch from 'cross-fetch';
import {errStatus, Reply, ReplyPromise} from '@0cfg/reply-common/lib/Reply';
import {has} from '@0cfg/utils-common/lib/has';
import {HttpContext} from '../HttpContext';
import {RequestReplyStub} from '../stub/RequestReplyStub';

export class HttpRequestReplyStub<Context extends HttpContext = HttpContext> implements RequestReplyStub<Context> {

    private readonly url: string;
    private context: Context | undefined;

    public constructor(url: string) {
        this.url = url.endsWith('/') ? url : url + '/';
    }

    public async execute<ReplyType, ArgsType>(method: string, args: ArgsType): ReplyPromise<ReplyType> {
        const config: any = {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify(args),
        };

        if (has(this.context) && has(this.context.requestHeaders)) {
            config.headers = httpHeadersToFetchHeaders(this.context.requestHeaders);
        }

        return fetch(this.url + method, config)
            .then((response: any) => response.json())
            .then((serialized: any) => Reply.createFromSerializedReply<ReplyType>(serialized))
            .catch((reason: any) => errStatus(reason));
    }

    public async setClientContext(context: Context): Promise<void> {
        this.context = context;
    }
}

const httpHeadersToFetchHeaders = (httpHeaders: Record<string, string | string[] | undefined>):
    Record<string, string> => {
    const fetchHeaders: Record<string, string> = {};
    for (const httpHeadersKey in httpHeaders) {
        const httpHeaderValue = httpHeaders[httpHeadersKey];

        if (!has(httpHeaderValue)) {
            continue;
        }

        const fetchHeaderValue = (Array.isArray(httpHeaderValue) && has(httpHeaderValue))
            ? httpHeaderValue.join(',')
            : httpHeaderValue;

        fetchHeaders[httpHeadersKey] = fetchHeaderValue;
    }
    return fetchHeaders;
};
