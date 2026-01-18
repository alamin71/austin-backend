import { Schema, model, Types } from 'mongoose';
import { IStream } from './stream.interface';

const streamSchema = new Schema<IStream>(
     {
          streamer: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               required: true,
          },
          title: {
               type: String,
               required: true,
               trim: true,
          },
          description: {
               type: String,
               trim: true,
          },
          category: {
               type: Schema.Types.ObjectId,
               ref: 'Category',
               required: true,
          },
          contentRating: {
               type: String,
               enum: ['G', 'PG', 'PG-13', 'R', '18+'],
               default: 'PG',
          },
          banner: {
               type: String,
          },
          status: {
               type: String,
               enum: ['scheduled', 'live', 'ended'],
               default: 'scheduled',
          },
          agora: {
               channelName: String,
               token: String,
               uid: Number,
               expiryTime: Date,
          },
          viewers: [
               {
                    type: Schema.Types.ObjectId,
                    ref: 'User',
               },
          ],
          currentViewerCount: {
               type: Number,
               default: 0,
          },
          peakViewerCount: {
               type: Number,
               default: 0,
          },
          startedAt: {
               type: Date,
          },
          endedAt: {
               type: Date,
          },
          duration: {
               type: Number, // in seconds
               default: 0,
          },
          chat: [
               {
                    type: Schema.Types.ObjectId,
                    ref: 'Message',
               },
          ],
          gifts: [
               {
                    type: Schema.Types.ObjectId,
                    ref: 'Gift',
               },
          ],
          polls: [
               {
                    type: Schema.Types.ObjectId,
                    ref: 'Poll',
               },
          ],
          analytics: {
               type: Schema.Types.ObjectId,
               ref: 'StreamAnalytics',
          },
          isScheduled: {
               type: Boolean,
               default: false,
          },
          scheduledStartTime: {
               type: Date,
          },
          allowComments: {
               type: Boolean,
               default: true,
          },
          allowGifts: {
               type: Boolean,
               default: true,
          },
          isAgeRestricted: {
               type: Boolean,
               default: false,
          },
          thumbnail: String,
          recordingUrl: String,
          isRecordingEnabled: {
               type: Boolean,
               default: false,
          },
          tags: [String],
     },
     {
          timestamps: true,
     },
);

// Index for frequently queried fields
streamSchema.index({ streamer: 1, status: 1 });
streamSchema.index({ category: 1, status: 1 });
streamSchema.index({ status: 1, createdAt: -1 });
streamSchema.index({ title: 'text', description: 'text', tags: 'text' });

export const Stream = model<IStream>('Stream', streamSchema);
