import { Schema, model } from 'mongoose';
import { IMoment, IMomentComment } from './moment.interface.js';

const momentSchema = new Schema<IMoment>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    media: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ['image', 'video'], required: true },
      },
    ],
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likesCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    saves: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

momentSchema.index({ author: 1, createdAt: -1 });
momentSchema.index({ createdAt: -1 });
momentSchema.index({ isDeleted: 1, createdAt: -1 });

const momentCommentSchema = new Schema<IMomentComment>(
  {
    moment: {
      type: Schema.Types.ObjectId,
      ref: 'Moment',
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likesCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

momentCommentSchema.index({ moment: 1, createdAt: 1 });

export const Moment = model<IMoment>('Moment', momentSchema);
export const MomentComment = model<IMomentComment>('MomentComment', momentCommentSchema);
