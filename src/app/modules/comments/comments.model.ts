import mongoose, { Schema } from 'mongoose';
import { IComment } from './comments.interface';

const commentSchema = new Schema<IComment>(
     {
          userId: { type: String, required: true },
          postId: { type: String, required: true },
          content: { type: String, required: true },
          likes: { type: Number, default: 0 },
          replies: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
     },
     { timestamps: true },
);

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
