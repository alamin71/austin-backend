import { Schema, model } from 'mongoose';
import { INotification } from './notification.interface.js';

const notificationSchema = new Schema<INotification>(
     {
          user: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               required: true,
          },
          type: {
               type: String,
               enum: [
                    'friend_request_sent',
                    'friend_request_accepted',
                    'friend_request_rejected',
                    'friend_request_received',
                    'subscription_purchased',
                    'gift_received',
                    'stream_live',
                    'comment',
               ],
               required: true,
          },
          content: {
               type: String,
               required: true,
          },
          relatedUser: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               default: null,
          },
          relatedId: {
               type: Schema.Types.ObjectId,
               default: null,
          },
          read: {
               type: Boolean,
               default: false,
          },
          actionUrl: {
               type: String,
               default: null,
          },
          icon: {
               type: String,
               default: null,
          },
     },
     {
          timestamps: true,
     },
);

// Index for faster queries
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });

export const Notification = model<INotification>('Notification', notificationSchema);
