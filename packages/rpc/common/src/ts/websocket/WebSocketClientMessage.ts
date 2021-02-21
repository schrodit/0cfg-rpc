export interface WebSocketClientMessage<T> {
    method?: string;
    requestId: number
    args: T;
}

