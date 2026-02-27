import { Types } from 'mongoose';

export type IMessage = {
     sender: Types.ObjectId;
     receiver: Types.ObjectId;
     content: string;
     type?: 'text' | 'image' | 'file';
     mediaUrl?: string;
     isRead: boolean;
     readAt?: Date;
     createdAt?: Date;
     updatedAt?: Date;
     _id?: Types.ObjectId;
};

export type MessageModel = any;
