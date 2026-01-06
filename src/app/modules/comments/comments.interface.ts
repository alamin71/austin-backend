import mongoose, { Document } from 'mongoose';
export interface IComment extends Document {
     userId: string;
     postId: string;
     content: string;
     likes: number;
     replies: mongoose.Schema.Types.ObjectId[];
}

export interface ICommentService {
     createComment(userId: string, postId: string, content: string): Promise<IComment>;
     getComments(postId: string): Promise<IComment[]>;
     likeComment(commentId: string): Promise<IComment>;
     replyToComment(commentId: string, userId: string, content: string): Promise<IComment>;
}
