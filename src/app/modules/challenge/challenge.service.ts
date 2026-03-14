import AppError from '../../../errors/AppError.js';
import { StatusCodes } from 'http-status-codes';
import { Challenge, ChallengeProgress, ChallengeRanking } from './challenge.model.js';
import { Wallet } from '../wallet/wallet.model.js';

/**
 * Challenge Service - Handle challenge logic
 * Based on Figma design (Explore > Challenges)
 */
class ChallengeService {
  private getTodayStartUTC() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private async seedDefaultDailyChallengesIfMissing() {
    const defaults = [
      {
        title: 'Gift Giver',
        description: 'Send 10 virtual gifts to streamers today',
        type: 'gift_giver' as const,
        targetAmount: 10,
        featherReward: 50,
        progressUnit: 'count' as const,
        isActive: true,
      },
      {
        title: 'Chirp 5 times',
        description: 'Leave 5 comments on any streams today',
        type: 'chirp_times' as const,
        targetAmount: 5,
        featherReward: 10,
        progressUnit: 'comments' as const,
        isActive: true,
      },
      {
        title: 'Stream Binge Watcher',
        description: 'Watch streams for a total of 2 hours today',
        type: 'stream_binge' as const,
        targetAmount: 2,
        featherReward: 30,
        progressUnit: 'hours' as const,
        isActive: true,
      },
      {
        title: 'Daily Commentator',
        description: 'Comment on 10 different streamers today',
        type: 'daily_commentator' as const,
        targetAmount: 10,
        featherReward: 20,
        progressUnit: 'streams' as const,
        isActive: true,
      },
    ];

    for (const item of defaults) {
      const exists = await Challenge.findOne({ type: item.type, isActive: true });
      if (!exists) {
        await Challenge.create(item);
      }
    }
  }

  private async expireOldProgress(userId?: string) {
    const todayStart = this.getTodayStartUTC();
    const filter: Record<string, unknown> = {
      challengeDate: { $lt: todayStart },
      status: 'in_progress',
    };

    if (userId) filter.userId = userId;

    await ChallengeProgress.updateMany(filter, { $set: { status: 'expired' } });
  }

  private async getOrCreateTodayProgress(
    userId: string,
    challengeId: string,
  ) {
    const todayStart = this.getTodayStartUTC();

    let progress = await ChallengeProgress.findOne({
      userId,
      challengeId,
      challengeDate: todayStart,
    });

    if (!progress) {
      progress = await ChallengeProgress.create({
        userId,
        challengeId,
        challengeDate: todayStart,
        currentProgress: 0,
        status: 'in_progress',
        feathersEarned: 0,
        metadata: {},
      });
    }

    return progress;
  }

  private async applyCompletionAndRewards(
    progress: any,
    challenge: any,
    userId: string,
  ) {
    if (progress.currentProgress < challenge.targetAmount || progress.status !== 'in_progress') {
      return;
    }

    progress.status = 'completed';
    progress.completedAt = new Date();
    progress.feathersEarned = challenge.featherReward;

    await Wallet.findOneAndUpdate(
      { userId },
      {
        $inc: {
          balance: challenge.featherReward,
          totalEarned: challenge.featherReward,
        },
      },
      { upsert: true },
    );

    await ChallengeRanking.findOneAndUpdate(
      { userId },
      {
        $inc: {
          totalFeathersEarned: challenge.featherReward,
          challengesCompleted: 1,
        },
        $set: { lastUpdated: new Date() },
      },
      { upsert: true },
    );
  }

  /**
   * Get all active challenges
   */
  async getChallenges() {
    await this.seedDefaultDailyChallengesIfMissing();
    const challenges = await Challenge.find({ isActive: true }).sort({ createdAt: -1 });
    return challenges;
  }

  /**
   * Get user's challenge progress
   */
  async getUserProgress(userId: string) {
    await this.seedDefaultDailyChallengesIfMissing();
    await this.expireOldProgress(userId);

    const todayStart = this.getTodayStartUTC();
    const challenges = await Challenge.find({ isActive: true }).sort({ createdAt: -1 });

    const progress = await ChallengeProgress.find({ userId, challengeDate: todayStart })
      .populate('challengeId')
      .sort({ createdAt: -1 });

    const progressByChallengeId = new Map(
      progress.map((p: any) => [p.challengeId?._id?.toString() || p.challengeId.toString(), p]),
    );

    const items = challenges.map((challenge: any) => {
      const p = progressByChallengeId.get(challenge._id.toString());
      return {
        challenge,
        progress: p?.currentProgress || 0,
        target: challenge.targetAmount,
        status: p?.status || 'in_progress',
        feathersEarned: p?.feathersEarned || 0,
        completedAt: p?.completedAt || null,
      };
    });

    // Get user's ranking
    const ranking = await ChallengeRanking.findOne({ userId });

    const totalEarnedToday = progress
      .filter((p: any) => p.status === 'completed')
      .reduce((sum: number, p: any) => sum + (p.feathersEarned || 0), 0);

    const completedToday = progress.filter((p: any) => p.status === 'completed').length;

    return {
      date: todayStart,
      progress: items,
      totals: {
        completedToday,
        totalEarnedToday,
      },
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

    const withRank = rankings.map((item: any, index: number) => ({
      ...item.toObject(),
      rank: index + 1,
    }));

    return {
      topThree: withRank.slice(0, 3),
      leaderboard: withRank,
    };
  }

  /**
   * Update challenge progress (called from gift/comment/stream services)
   */
  async updateProgress(
    userId: string,
    challengeType: 'gift_giver' | 'chirp_times' | 'stream_binge' | 'daily_commentator' | 'custom',
    incrementBy: number = 1
  ) {
    await this.seedDefaultDailyChallengesIfMissing();
    await this.expireOldProgress(userId);

    const challenges = await Challenge.find({ isActive: true, type: challengeType });

    for (const challenge of challenges) {
      const progress = await this.getOrCreateTodayProgress(userId, String((challenge as any)._id));
      if (progress.status === 'completed') {
        continue;
      }

      progress.currentProgress += incrementBy;
      await this.applyCompletionAndRewards(progress, challenge, userId);
      await progress.save();
    }

    return { success: true };
  }

  /**
   * Daily commentator requires comments on different streamers.
   */
  async updateDailyCommentatorProgress(userId: string, streamerId: string) {
    await this.seedDefaultDailyChallengesIfMissing();
    await this.expireOldProgress(userId);

    const challenges = await Challenge.find({ isActive: true, type: 'daily_commentator' });

    for (const challenge of challenges) {
      const progress = await this.getOrCreateTodayProgress(userId, String((challenge as any)._id));
      if (progress.status === 'completed') {
        continue;
      }

      const metadata = progress.metadata || {};
      const uniqueStreamerIds = new Set<string>(metadata.uniqueStreamerIds || []);
      uniqueStreamerIds.add(streamerId);

      progress.metadata = {
        ...metadata,
        uniqueStreamerIds: Array.from(uniqueStreamerIds),
      };
      progress.currentProgress = uniqueStreamerIds.size;

      await this.applyCompletionAndRewards(progress, challenge, userId);
      await progress.save();
    }

    return { success: true };
  }

  /**
   * Start watch session for stream binge challenge.
   */
  async startStreamWatchSession(userId: string, streamId: string) {
    await this.seedDefaultDailyChallengesIfMissing();
    await this.expireOldProgress(userId);

    const challenges = await Challenge.find({ isActive: true, type: 'stream_binge' });

    for (const challenge of challenges) {
      const progress = await this.getOrCreateTodayProgress(userId, String((challenge as any)._id));
      if (progress.status === 'completed') {
        continue;
      }

      const metadata = progress.metadata || {};
      const sessions = metadata.activeStreamSessions || {};
      if (!sessions[streamId]) {
        sessions[streamId] = new Date().toISOString();
      }

      progress.metadata = {
        ...metadata,
        activeStreamSessions: sessions,
      };

      await progress.save();
    }

    return { success: true };
  }

  /**
   * Stop watch session and convert minutes to hour progress.
   */
  async endStreamWatchSession(userId: string, streamId: string) {
    await this.seedDefaultDailyChallengesIfMissing();
    await this.expireOldProgress(userId);

    const challenges = await Challenge.find({ isActive: true, type: 'stream_binge' });

    for (const challenge of challenges) {
      const progress = await this.getOrCreateTodayProgress(userId, String((challenge as any)._id));
      if (progress.status === 'completed') {
        continue;
      }

      const metadata = progress.metadata || {};
      const sessions: Record<string, string> = metadata.activeStreamSessions || {};
      const startedAt = sessions[streamId];

      if (!startedAt) {
        continue;
      }

      const now = Date.now();
      const startMs = new Date(startedAt).getTime();
      const minutes = Math.max(0, Math.floor((now - startMs) / 60000));

      delete sessions[streamId];

      const watchedMinutes = (metadata.watchedMinutes || 0) + minutes;
      const watchedHours = Number((watchedMinutes / 60).toFixed(2));

      progress.metadata = {
        ...metadata,
        activeStreamSessions: sessions,
        watchedMinutes,
      };
      progress.currentProgress = watchedHours;

      await this.applyCompletionAndRewards(progress, challenge, userId);
      await progress.save();
    }

    return { success: true };
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
