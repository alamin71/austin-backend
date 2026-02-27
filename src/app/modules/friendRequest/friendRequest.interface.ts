import { Model, Types } from 'mongoose';

export type IFriendRequest = {
     sender: Types.ObjectId;
     receiver: Types.ObjectId;
     status: 'pending' | 'accepted' | 'rejected' | 'blocked';
     requestedAt?: Date;
     respondedAt?: Date;
     _id?: Types.ObjectId;
};

export type FriendRequestModel = Model<IFriendRequest>;
