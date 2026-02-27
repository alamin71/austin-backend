import { Schema, model } from 'mongoose';
import { IMessage, MessageModel } from './message.interface.js';

const messageSchema = new Schema<IMessage, MessageModel>(
     {
          sender: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               required: true,
          },
          receiver: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               required: true,
          },
          content: {
               type: String,
               required: true,
          },
          type: {
               type: String,
               enum: ['text', 'image', 'file'],
               default: 'text',
          },
          mediaUrl: {
               type: String,
               default: null,
          },
          isRead: {
               type: Boolean,
               default: false,
          },
          readAt: {
               type: Date,
               default: null,
          },
     },
     {
          timestamps: true,
     },
);

// Indexes for faster queries
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ receiver: 1, isRead: 1 });
messageSchema.index({ createdAt: -1 });

export const Message = model<IMessage, MessageModel>('Message', messageSchema);
