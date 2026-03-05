import { model, Schema } from 'mongoose';
import { IFeedback } from './feedback.interface.js';

const feedbackSchema = new Schema<IFeedback>(
     {
          user: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               required: true,
          },
          rating: {
               type: Number,
               required: true,
               min: 1,
               max: 5,
          },
          message: {
               type: String,
               required: true,
               trim: true,
          },
     },
     { timestamps: true },
);

export const Feedback = model<IFeedback>('Feedback', feedbackSchema);
