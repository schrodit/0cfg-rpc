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
            this.socket.onClose(message => resolve(errStatus(message)));
            this.socket.onMessage(data => {
                const message = parse<SerializedReply<ReplyT>>(data);
                if (message.requestId === requestId) {
                    resolve(Reply.createFromSerializedReply(message.reply));
                }
            });
        });
        const sendSuccessfulReply = send<ArgsT>(this.socket, {
            method: method,
            requestId: requestId,
            args: args,
        });


        if (sendSuccessfulReply.notOk()) {
            return sendSuccessfulReply;
        }

        return result;
    }
}
