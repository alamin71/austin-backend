import { Schema, model, Types } from 'mongoose';

interface IMessage {
     _id?: Types.ObjectId;
     stream: Types.ObjectId;
     sender: Types.ObjectId;
     content: string;
     type: 'text' | 'emoji' | 'gift' | 'system';
     messageData?: {
          giftId?: Types.ObjectId;
          giftAmount?: number;
          giftName?: string;
     };
     isModerated: boolean;
     isPinned: boolean;
     createdAt?: Date;
     updatedAt?: Date;
}

const messageSchema = new Schema<IMessage>(
     {
          stream: {
               type: Schema.Types.ObjectId,
               ref: 'Stream',
               required: true,
          },
          sender: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               required: true,
          },
          content: {
               type: String,
               required: true,
               trim: true,
               maxlength: 500,
          },
          type: {
               type: String,
               enum: ['text', 'emoji', 'gift', 'system'],
               default: 'text',
          },
          messageData: {
               giftId: Schema.Types.ObjectId,
               giftAmount: Number,
               giftName: String,
          },
          isModerated: {
               type: Boolean,
               default: false,
          },
          isPinned: {
               type: Boolean,
               default: false,
          },
     },
     {
          timestamps: true,
     },
);

// Index for fast chat retrieval
messageSchema.index({ stream: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

export const Message = model<IMessage>('Message', messageSchema);
