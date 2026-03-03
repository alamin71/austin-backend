import AppError from '../../../errors/AppError.js';
import { StatusCodes } from 'http-status-codes';
import { Challenge, ChallengeProgress, ChallengeRanking } from './challenge.model.js';
import { Wallet } from '../wallet/wallet.model.js';
import mongoose from 'mongoose';

/**
 * Challenge Service - Handle challenge logic
 * Based on Figma design (Explore > Challenges)
 */
class ChallengeService {
  /**
   * Get all active challenges
   */
  async getChallenges() {
    const challenges = await Challenge.find({ isActive: true }).sort({ createdAt: -1 });
    return challenges;
  }

  /**
   * Get user's challenge progress
   */
  async getUserProgress(userId: string) {
    const progress = await ChallengeProgress.find({ userId })
      .populate('challengeId')
      .sort({ createdAt: -1 });

    // Get user's ranking
    const ranking = await ChallengeRanking.findOne({ userId });

    return {
      progress,
      ranking: ranking || {
        totalFeathersEarned: 0,
        challengesCompleted: 0,
        rank: 0,
      },
    };
  }

  /**
   * Get global rankings (leaderboard)
   */
  async getRankings(limit: number = 10) {
    const rankings = await ChallengeRanking.find()
      .populate('userId', 'name userName image')
      .sort({ totalFeathersEarned: -1 })
      .limit(limit);

    return rankings;
  }

  /**
   * Update challenge progress (called from gift/comment/stream services)
   */
  async updateProgress(
    userId: string,
    challengeType: 'gift_giver' | 'chirp_times' | 'stream_binge' | 'daily_commentator' | 'custom',
    incrementBy: number = 1
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find active challenges of this type
      const challenges = await Challenge.find({ isActive: true, type: challengeType });

      for (const challenge of challenges) {
        // Find or create progress
        let progress = await ChallengeProgress.findOne({
          userId,
          challengeId: challenge._id,
          status: 'in_progress',
        });

        if (!progress) {
          const newProgress = await ChallengeProgress.create([
            {
              userId,
              challengeId: challenge._id,
              currentProgress: 0,
              status: 'in_progress',
            },
          ], { session });
          progress = newProgress[0];
        }

        // Update progress
        progress.currentProgress += incrementBy;

        // Check if completed
        if (progress.currentProgress >= challenge.targetAmount && progress.status === 'in_progress') {
          progress.status = 'completed';
          progress.completedAt = new Date();
          progress.feathersEarned = challenge.featherReward;

          // Award feathers to wallet
          await Wallet.findOneAndUpdate(
            { userId },
            {
              $inc: {
                balance: challenge.featherReward,
                totalEarned: challenge.featherReward,
              },
            },
            { upsert: true, session }
          );

          // Update user ranking
          await ChallengeRanking.findOneAndUpdate(
            { userId },
            {
              $inc: {
                totalFeathersEarned: challenge.featherReward,
                challengesCompleted: 1,
              },
              lastUpdated: new Date(),
            },
            { upsert: true, session }
          );
        }

        await progress.save({ session });
      }

      await session.commitTransaction();
      return { success: true };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Admin: Create a challenge
   */
  async createChallenge(data: any) {
    const challenge = await Challenge.create(data);
    return challenge;
  }

  /**
   * Admin: Update a challenge
   */
  async updateChallenge(challengeId: string, data: any) {
    const challenge = await Challenge.findByIdAndUpdate(challengeId, data, { new: true });
    if (!challenge) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Challenge not found');
    }
    return challenge;
  }

  /**
   * Admin: Delete a challenge
   */
  async deleteChallenge(challengeId: string) {
    const challenge = await Challenge.findByIdAndDelete(challengeId);
    if (!challenge) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Challenge not found');
    }
    return challenge;
  }

  /**
   * Recalculate rankings (run periodically via cron)
   */
  async recalculateRankings() {
    const rankings = await ChallengeRanking.find().sort({ totalFeathersEarned: -1 });

    for (let i = 0; i < rankings.length; i++) {
      rankings[i].rank = i + 1;
      await rankings[i].save();
    }

    return { success: true, totalRanked: rankings.length };
  }
}

export default new ChallengeService();
