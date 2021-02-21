import {Reply} from '@0cfg/reply-common/lib/Reply';
import {HttpContext} from '../HttpContext';

export type ListenerRemovalFunction = () => void;

export interface BidiStreamStub<ClientMessageT, ServerMessageT> {
    onCompleted(listener: (end: Reply) => Promise<void>): void;

    onMessage(listener: (message: ServerMessageT) => Promise<void>): void;

    complete(end: Reply): void;

    send(message: ClientMessageT, method?: string): void;
}
