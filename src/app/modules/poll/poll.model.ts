import { Schema, model } from 'mongoose';
import { IPoll, IPollVote } from './poll.interface.js';

const pollOptionSchema = new Schema(
     {
          option: {
               type: String,
               required: true,
               trim: true,
          },
          votes: {
               type: Number,
               default: 0,
          },
          voters: [
               {
                    type: Schema.Types.ObjectId,
                    ref: 'User',
               },
          ],
     },
     { _id: false },
);

const pollSchema = new Schema<IPoll>(
     {
          stream: {
               type: Schema.Types.ObjectId,
               ref: 'Stream',
               required: true,
          },
          streamer: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               required: true,
          },
          question: {
               type: String,
               required: true,
               trim: true,
               maxlength: 200,
          },
          options: {
               type: [pollOptionSchema],
               required: true,
               validate: {
                    validator: function (options: any[]) {
                         return options.length >= 2 && options.length <= 10;
                    },
                    message: 'Poll must have between 2 and 10 options',
               },
          },
          duration: {
               type: Number,
               required: true,
               min: 30, // Minimum 30 seconds
               max: 3600, // Maximum 1 hour
          },
          startTime: {
               type: Date,
               required: true,
               default: Date.now,
          },
          endTime: {
               type: Date,
               required: true,
          },
          isActive: {
               type: Boolean,
               default: true,
          },
          totalVotes: {
               type: Number,
               default: 0,
          },
          allowMultipleVotes: {
               type: Boolean,
               default: false,
          },
     },
     {
          timestamps: true,
     },
);

// Indexes
pollSchema.index({ stream: 1, isActive: 1 });
pollSchema.index({ endTime: 1 });

// Pre-save hook to calculate endTime
pollSchema.pre('save', function (next) {
     if (this.isNew) {
          const startTime = this.startTime as Date;
          const duration = this.duration as number;
          this.endTime = new Date(startTime.getTime() + duration * 1000);
     }
     next();
});

const pollVoteSchema = new Schema<IPollVote>(
     {
          poll: {
               type: Schema.Types.ObjectId,
               ref: 'Poll',
               required: true,
          },
          user: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               required: true,
          },
          optionIndex: {
               type: Number,
               required: true,
          },
     },
     {
          timestamps: true,
     },
);

// Compound index to prevent duplicate votes (if multiple votes not allowed)
pollVoteSchema.index({ poll: 1, user: 1 });

export const Poll = model<IPoll>('Poll', pollSchema);
export const PollVote = model<IPollVote>('PollVote', pollVoteSchema);
