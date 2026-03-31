import { Types } from 'mongoose';

export interface IMomentMedia {
  url: string;
  type: 'image' | 'video';
}

export interface IMoment {
  _id?: Types.ObjectId;
  author: Types.ObjectId;
  description?: string;
  media: IMomentMedia[];
  likes: Types.ObjectId[];
  likesCount: number;
  sharesCount: number;
  commentsCount: number;
  saves: Types.ObjectId[];
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMomentComment {
  _id?: Types.ObjectId;
  moment: Types.ObjectId;
  author: Types.ObjectId;
  text: string;
  likes: Types.ObjectId[];
  likesCount: number;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
