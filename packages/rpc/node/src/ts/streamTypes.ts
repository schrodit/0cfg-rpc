import {Reply} from '@0cfg/reply-common/lib/Reply';

export type Completer = (message: Reply<never>) => void;
export type Sender<T> = (message: T) => void;
