import { model, Schema } from 'mongoose';
import { IChat } from './chat.interface';

const chatSchema = new Schema<IChat>(
     {
          participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
          lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
          status: { type: String, enum: ['active', 'deleted'], default: 'active' },

          readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
     },
     {
          timestamps: true,
     },
);

export const Chat = model<IChat>('Chat', chatSchema);
