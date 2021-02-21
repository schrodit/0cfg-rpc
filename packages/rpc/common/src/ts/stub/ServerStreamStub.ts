import {Reply} from '@0cfg/reply-common/lib/Reply';
import {ListenerRemovalFunction} from './BidiStreamStub';
import {HttpContext} from '../HttpContext';

export interface ServerStreamStub<ClientMessageT, ServerMessageT> {
    onCompleted(listener: (end: Reply) => Promise<void>): void;

    onMessage(listener: (message: ServerMessageT) => Promise<void>): void;

    complete(end: Reply): void;

    start(message: ClientMessageT): void;
}
