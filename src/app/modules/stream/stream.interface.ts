import { Types } from 'mongoose';

export interface IStream {
     _id?: Types.ObjectId;
     streamer: Types.ObjectId;
     title: string;
     description?: string;
     category: Types.ObjectId;
     contentRating: 'all_ages' | 'PG-13' | 'R' | '18+';
     banner?: string;
     bannerPosition?: 'top' | 'bottom' | 'center';
     status: 'scheduled' | 'live' | 'paused' | 'ended';
     visibility: 'public' | 'followers' | 'subscribers';
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
     enablePolls: boolean;
     enableAdBanners: boolean;
     isAgeRestricted: boolean;
     thumbnail?: string;
     recordingUrl?: string;
     recordingResourceId?: string;
     recordingSid?: string;
     isRecordingEnabled: boolean;
     streamControls: {
          cameraOn: boolean;
          micOn: boolean;
          background?: string;
     };
     tags: string[];
     likes: number;
     createdAt?: Date;
     updatedAt?: Date;
}
