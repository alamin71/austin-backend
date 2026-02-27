import { Schema, model, models } from 'mongoose';
import { IFriendRequest, FriendRequestModel } from './friendRequest.interface.js';

const friendRequestSchema = new Schema<IFriendRequest, FriendRequestModel>(
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
          status: {
               type: String,
               enum: ['pending', 'accepted', 'rejected', 'blocked'],
               default: 'pending',
          },
          requestedAt: {
               type: Date,
               default: Date.now,
          },
          respondedAt: {
               type: Date,
               default: null,
          },
     },
     {
          timestamps: true,
     },
);

// Index for faster queries
friendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });
friendRequestSchema.index({ receiver: 1, status: 1 });
friendRequestSchema.index({ sender: 1, status: 1 });

export const FriendRequest = (models.FriendRequest as FriendRequestModel) || model<IFriendRequest, FriendRequestModel>(
     'FriendRequest',
     friendRequestSchema,
);
