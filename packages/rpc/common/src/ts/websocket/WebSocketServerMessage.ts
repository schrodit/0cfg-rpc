export interface WebSocketServerMessage<T> {
    requestId: number
    reply: T;
    complete?: boolean
}
