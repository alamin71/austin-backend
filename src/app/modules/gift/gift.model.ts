import { Schema, model } from 'mongoose';
import { IGift, IGiftTransaction } from './gift.interface.js';

const giftSchema = new Schema<IGift>(
     {
          name: {
               type: String,
               required: true,
               unique: true,
               trim: true,
          },
          description: {
               type: String,
               trim: true,
          },
          image: {
               type: String,
               required: true,
          },
          animation: {
               type: String, // Lottie animation URL
          },
          price: {
               type: Number,
               required: true,
               min: 0,
          },
          category: {
               type: String,
               enum: ['basic', 'premium', 'luxury', 'exclusive'],
               default: 'basic',
          },
          isActive: {
               type: Boolean,
               default: true,
          },
          order: {
               type: Number,
               default: 0,
          },
     },
     {
          timestamps: true,
     },
);

// Indexes
giftSchema.index({ isActive: 1, order: 1 });
giftSchema.index({ category: 1 });

const giftTransactionSchema = new Schema<IGiftTransaction>(
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
          stream: {
               type: Schema.Types.ObjectId,
               ref: 'Stream',
               required: true,
          },
          gift: {
               type: Schema.Types.ObjectId,
               ref: 'Gift',
               required: true,
          },
          quantity: {
               type: Number,
               required: true,
               min: 1,
               default: 1,
          },
          totalAmount: {
               type: Number,
               required: true,
               min: 0,
          },
          message: {
               type: String,
               trim: true,
               maxlength: 200,
          },
          isAnonymous: {
               type: Boolean,
               default: false,
          },
          status: {
               type: String,
               enum: ['pending', 'completed', 'refunded'],
               default: 'completed',
          },
     },
     {
          timestamps: true,
     },
);

// Indexes
giftTransactionSchema.index({ stream: 1, createdAt: -1 });
giftTransactionSchema.index({ receiver: 1, createdAt: -1 });
giftTransactionSchema.index({ sender: 1, createdAt: -1 });

export const Gift = model<IGift>('Gift', giftSchema);
export const GiftTransaction = model<IGiftTransaction>(
     'GiftTransaction',
     giftTransactionSchema,
);
