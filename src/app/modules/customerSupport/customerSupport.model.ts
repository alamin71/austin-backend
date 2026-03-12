import { model, Schema } from 'mongoose';
import { ICustomerSupport, ISupportMessage } from './customerSupport.interface.js';

const customerSupportSchema = new Schema<ICustomerSupport>(
     {
          user: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               required: true,
          },
          status: {
               type: String,
               enum: ['open', 'in-progress', 'closed'],
               default: 'open',
          },
          lastMessage: {
               type: String,
               default: '',
          },
          lastMessageAt: {
               type: Date,
               default: Date.now,
          },
          unreadCountUser: {
               type: Number,
               default: 0,
          },
          unreadCountAdmin: {
               type: Number,
               default: 0,
          },
     },
     { timestamps: true },
);

const supportMessageSchema = new Schema<ISupportMessage>(
     {
          conversation: {
               type: Schema.Types.ObjectId,
               ref: 'CustomerSupport',
               required: true,
          },
          sender: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               required: true,
          },
          senderRole: {
               type: String,
               enum: ['user', 'admin'],
               required: true,
          },
          message: {
               type: String,
               required: true,
               trim: true,
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
          replyTo: {
               type: Schema.Types.ObjectId,
               ref: 'SupportMessage',
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
     { timestamps: true },
);

export const CustomerSupport = model<ICustomerSupport>('CustomerSupport', customerSupportSchema);
export const SupportMessage = model<ISupportMessage>('SupportMessage', supportMessageSchema);
