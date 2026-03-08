import { Types } from 'mongoose';

export interface ISupportMessage {
     _id?: Types.ObjectId;
     conversation: Types.ObjectId;
     sender: Types.ObjectId;
     senderRole: 'user' | 'admin';
     message: string;
     type?: 'text' | 'image' | 'file';
     mediaUrl?: string;
     isRead: boolean;
     readAt?: Date;
     createdAt?: Date;
     updatedAt?: Date;
}

export interface ICustomerSupport {
     _id?: Types.ObjectId;
     user: Types.ObjectId;
     status: 'open' | 'in-progress' | 'closed';
     lastMessage?: string;
     lastMessageAt?: Date;
     unreadCountUser: number; // Unread count for user
     unreadCountAdmin: number; // Unread count for admin
     createdAt?: Date;
     updatedAt?: Date;
}
