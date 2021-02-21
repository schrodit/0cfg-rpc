export enum HttpMethod {
    /**
     * The `CONNECT` method establishes a tunnel to the server identified by the
     * target resource.
     */
    Connect = 'connect',

    /**
     * The `DELETE` method deletes the specified resource.
     */
    Delete = 'delete',

    /**
     * The `GET` method requests a representation of the specified resource.
     * Requests using GET should only retrieve data.
     */
    Get = 'get',

    /**
     * The `HEAD` method asks for a response identical to that of a GET request,
     * but without the response body.
     */
    Head = 'head',

    /**
     * The `OPTIONS` method is used to describe the communication options for the
     * target resource.
     */
    Options = 'options',

    /**
     * The PATCH method is used to apply partial modifications to a resource.
     */
    Patch = 'patch',

    /**
     * The `POST` method is used to submit an entity to the specified resource,
     * often causing a change in state or side effects on the server.
     */
    Post = 'post',

    /**
     * The `PUT` method replaces all current representations of the target
     * resource with the request payload.
     */
    Put = 'put',

    /**
     * The `TRACE` method performs a message loop-back test along the path to the
     * target resource.
     */
    Trace = 'trace'
}