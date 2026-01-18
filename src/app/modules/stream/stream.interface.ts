import { Types } from 'mongoose';

export interface IStream {
     _id?: Types.ObjectId;
     streamer: Types.ObjectId;
     title: string;
     description?: string;
     category: Types.ObjectId;
     contentRating: 'G' | 'PG' | 'PG-13' | 'R' | '18+';
     banner?: string;
     status: 'scheduled' | 'live' | 'ended';
     agora?: {
          channelName: string;
          token: string;
          uid: number;
          expiryTime: Date;
     };
     viewers: Types.ObjectId[];
     currentViewerCount: number;
     peakViewerCount: number;
     startedAt?: Date;
     endedAt?: Date;
     duration: number;
     chat: Types.ObjectId[];
     gifts: Types.ObjectId[];
     polls: Types.ObjectId[];
     analytics?: Types.ObjectId;
     isScheduled: boolean;
     scheduledStartTime?: Date;
     allowComments: boolean;
     allowGifts: boolean;
     isAgeRestricted: boolean;
     thumbnail?: string;
     recordingUrl?: string;
     isRecordingEnabled: boolean;
     tags: string[];
     createdAt?: Date;
     updatedAt?: Date;
}
