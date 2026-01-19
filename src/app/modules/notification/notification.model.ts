import { Schema, model } from 'mongoose';
import { INotification } from './notification.interface.js';

const notificationSchema = new Schema<INotification>({
     user: { type: String, required: true },
     type: { type: String, required: true },
     content: { type: String, required: true },
     read: { type: Boolean, default: false },
     createdAt: { type: Date, default: Date.now },
});

export const Notification = model<INotification>('Notification', notificationSchema);
