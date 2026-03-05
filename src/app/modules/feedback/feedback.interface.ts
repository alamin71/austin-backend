import { Types } from 'mongoose';

export interface IFeedback {
     _id?: Types.ObjectId;
     user: Types.ObjectId;
     rating: number; // 1-5 stars
     message: string;
     createdAt?: Date;
     updatedAt?: Date;
}
