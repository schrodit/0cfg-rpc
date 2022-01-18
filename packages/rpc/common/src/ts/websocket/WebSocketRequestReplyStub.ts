import {RequestReplyStub} from '../stub/RequestReplyStub';
import {errStatus, Reply, ReplyPromise, SerializedReply} from '@0cfg/reply-common/lib/Reply';
import {parse, send} from './utils';
import {CommonReconnectingWebSocket} from '@0cfg/stubs-common/lib/messaging/CommonReconnectingWebSocket';
import {Sequential} from '@0cfg/utils-common/lib/Sequential';

export class WebSocketRequestReplyStub implements RequestReplyStub {
    private readonly sequential: Sequential;
    private readonly socket: CommonReconnectingWebSocket;

    public constructor(socket: CommonReconnectingWebSocket, sequential: Sequential) {
        this.sequential = sequential;
        this.socket = socket;
    }

    public async execute<ReplyT, ArgsT>(method: string, args: ArgsT): ReplyPromise<ReplyT> {
        const requestId: number = this.sequential.next();
        const result = new Promise<Reply<ReplyT>>((resolve) => {
            setTimeout(() => resolve(resolve(errStatus('Timeout'))), 2000);
            this.socket.onClose(message => resolve(errStatus(message)));
            this.socket.onMessage(data => {
                const message = parse<SerializedReply<ReplyT>>(data);
                if (message.requestId === requestId) {
                    resolve(Reply.createFromSerializedReply(message.reply));
                }
            });
        });
        send<ArgsT>(this.socket, {
            method: method,
            requestId: requestId,
            args: args,
        });
        return result;
    }
}
