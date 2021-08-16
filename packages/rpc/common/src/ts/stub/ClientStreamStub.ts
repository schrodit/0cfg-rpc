import {Reply} from '@0cfg/reply-common/lib/Reply';

export interface ClientStreamStub<ClientMessageT> {
    onCompleted(listener: (end: Reply) => Promise<void>): void;

    complete(end: Reply): void;

    send(message: ClientMessageT): void;
}