import { Schema, model, Types } from 'mongoose';

interface IStreamAnalytics {
     _id?: Types.ObjectId;
     stream: Types.ObjectId;
     totalViewers: number;
     peakViewers: number;
     giftsReceived: number;
     duration: number;
     likes: number;
     newSubscribers: number;
     newFollowers: number;
     revenue: number;
     chatCount: number;
     avgEngagementRate: number;
     growthStats?: {
          subscribersGain: number;
          followersGain: number;
          likesGain: number;
     };
     viewerRetention: number; // percentage
     createdAt?: Date;
     updatedAt?: Date;
}

const streamAnalyticsSchema = new Schema<IStreamAnalytics>(
     {
          stream: {
               type: Schema.Types.ObjectId,
               ref: 'Stream',
               required: true,
               unique: true,
          },
          totalViewers: {
               type: Number,
               default: 0,
          },
          peakViewers: {
               type: Number,
               default: 0,
          },
          giftsReceived: {
               type: Number,
               default: 0,
          },
          duration: {
               type: Number,
               default: 0,
          },
          likes: {
               type: Number,
               default: 0,
          },
          newSubscribers: {
               type: Number,
               default: 0,
          },
          newFollowers: {
               type: Number,
               default: 0,
          },
          revenue: {
               type: Number,
               default: 0,
          },
          chatCount: {
               type: Number,
               default: 0,
          },
          avgEngagementRate: {
               type: Number,
               default: 0,
          },
          growthStats: {
               subscribersGain: Number,
               followersGain: Number,
               likesGain: Number,
          },
          viewerRetention: {
               type: Number,
               default: 0,
          },
     },
     {
          timestamps: true,
     },
);

// Index removed - 'unique: true' on stream field already creates an index

export const StreamAnalytics = model<IStreamAnalytics>(
     'StreamAnalytics',
     streamAnalyticsSchema,
);
