import { Types } from 'mongoose';

export interface IPollOption {
     option: string;
     votes: number;
     voters: Types.ObjectId[]; // User IDs who voted for this option
}

export interface IPoll {
     _id?: Types.ObjectId;
     stream: Types.ObjectId;
     streamer: Types.ObjectId;
     question: string;
     options: IPollOption[];
     duration: number; // Duration in seconds
     startTime: Date;
     endTime: Date;
     isActive: boolean;
     totalVotes: number;
     allowMultipleVotes: boolean;
     createdAt?: Date;
     updatedAt?: Date;
}

export interface IPollVote {
     _id?: Types.ObjectId;
     poll: Types.ObjectId;
     user: Types.ObjectId;
     optionIndex: number;
     createdAt?: Date;
}
