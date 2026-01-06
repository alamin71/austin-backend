import { Model, Types } from 'mongoose';

export interface IReaction {
     userId: string;
     reactionType: 'like' | 'love' | 'thumbs_up' | 'laugh' | 'angry' | 'sad'; // Type of reaction
     timestamp: Date;
}
export type IMessage = {
     chatId: Types.ObjectId;
     sender: Types.ObjectId;
     text?: string;
     image?: string;
     reactions: IReaction[];
     read: boolean;
     isDeleted: false;
     type: 'text' | 'image' | 'doc' | 'both';
};

export type MessageModel = Model<IMessage, Record<string, unknown>>;
