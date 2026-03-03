import mongoose, { Schema, Document } from 'mongoose';

/**
 * Challenge model based on Figma design (Explore > Challenges tab)
 * Users complete challenges to earn feathers and climb rankings
 */

export interface IChallenge extends Document {
  title: string;
  description: string;
  type: 'gift_giver' | 'chirp_times' | 'stream_binge' | 'daily_commentator' | 'custom';
  
  // Requirements
  targetAmount: number; // e.g., 10 gifts, 2 hours watch, 10 streams, etc.
  requiredDays?: number; // For recurring challenges
  
  // Rewards
  featherReward: number; // Feathers earned on completion
  badgeReward?: string; // Optional badge icon/name
  
  // Progress tracking
  progressUnit: 'count' | 'hours' | 'streams' | 'comments'; // How to measure progress
  
  // Status
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IChallengeProgress extends Document {
  userId: mongoose.Types.ObjectId;
  challengeId: mongoose.Types.ObjectId;
  currentProgress: number; // e.g., 5/10 gifts sent
  status: 'in_progress' | 'completed' | 'expired';
  completedAt?: Date;
  feathersEarned: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChallengeRanking extends Document {
  userId: mongoose.Types.ObjectId;
  totalFeathersEarned: number; // Total from all challenges
  challengesCompleted: number;
  rank: number; // Global rank
  lastUpdated: Date;
}

// Challenge Schema - Admin creates challenges
const challengeSchema = new Schema<IChallenge>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      // e.g., "Gift Giver", "Chirp 5 times", "Stream Binge Watcher"
    },
    description: {
      type: String,
      required: true,
      // e.g., "Send 10 virtual gifts to streamers today"
    },
    type: {
      type: String,
      enum: ['gift_giver', 'chirp_times', 'stream_binge', 'daily_commentator', 'custom'],
      required: true,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 1,
      // e.g., 10 for "10 gifts", 2 for "2 hours watch time"
    },
    requiredDays: {
      type: Number,
      min: 1,
      // For daily/weekly recurring challenges
    },
    featherReward: {
      type: Number,
      required: true,
      min: 1,
      // Feathers to award upon completion
    },
    badgeReward: {
      type: String,
      // Optional badge icon URL or name
    },
    progressUnit: {
      type: String,
      enum: ['count', 'hours', 'streams', 'comments'],
      required: true,
      default: 'count',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: Date,
    endDate: Date,
  },
  {
    timestamps: true,
  }
);

// Challenge Progress Schema - User progress on challenges
const challengeProgressSchema = new Schema<IChallengeProgress>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true,
      index: true,
    },
    currentProgress: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'expired'],
      default: 'in_progress',
      index: true,
    },
    completedAt: Date,
    feathersEarned: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Challenge Ranking Schema - Global leaderboard
const challengeRankingSchema = new Schema<IChallengeRanking>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    totalFeathersEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    challengesCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    rank: {
      type: Number,
      index: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
challengeSchema.index({ isActive: 1, type: 1 });
challengeProgressSchema.index({ userId: 1, status: 1 });
challengeProgressSchema.index({ challengeId: 1, status: 1 });
challengeRankingSchema.index({ totalFeathersEarned: -1 }); // For leaderboard sorting

export const Challenge = mongoose.model<IChallenge>('Challenge', challengeSchema);
export const ChallengeProgress = mongoose.model<IChallengeProgress>(
  'ChallengeProgress',
  challengeProgressSchema
);
export const ChallengeRanking = mongoose.model<IChallengeRanking>(
  'ChallengeRanking',
  challengeRankingSchema
);
