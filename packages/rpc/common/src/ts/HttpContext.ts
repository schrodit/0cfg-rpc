import {HttpStatusCode} from '@0cfg/http-common/lib/HttpStatusCode';

export const CLIENT_CONTEXT_METHOD = 'setClientContext';

export interface HttpContext {
    readonly requestHeaders: Readonly<Record<string, string | string[] | undefined>>;
    readonly responseHeaders: Record<string, number | string | string[]>;
    /**
     * This is intended to be set by a middleware, only if it is required by a client of the api, to notify the
     * {@link RpcServer} that it should set the http status code in the response
     * (only if the response if send via http).
     */
    httpStatusCode: HttpStatusCode;
}
