import { Schema, model } from 'mongoose';
import { IMessage, MessageModel } from './message.interface';

const messageSchema = new Schema<IMessage, MessageModel>(
     {
          chatId: {
               type: Schema.Types.ObjectId,
               required: true,
               ref: 'Chat',
          },
          sender: {
               type: Schema.Types.ObjectId,
               required: true,
               ref: 'User',
          },
          text: {
               type: String,
          },
          image: {
               type: String,
          },
          read: {
               type: Boolean,
               default: false,
          },
          type: {
               type: String,
               enum: ['text', 'image'],
               default: 'text',
          },
          isDeleted: { type: Boolean, default: false, required: true },
          reactions: [
               {
                    userId: {
                         type: Schema.Types.ObjectId,
                         required: true,
                         ref: 'User',
                    },
                    reactionType: {
                         type: String,
                         enum: ['like', 'love', 'thumbs_up', 'laugh', 'angry', 'sad'],
                         required: true,
                    },
                    timestamp: {
                         type: Date,
                         default: Date.now,
                    },
               },
          ],
     },
     {
          timestamps: true,
     },
);

export const Message = model<IMessage, MessageModel>('Message', messageSchema);
