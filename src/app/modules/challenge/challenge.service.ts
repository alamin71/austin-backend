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

  private getProgressUnitFromType(type: string) {
    switch (type) {
      case 'gift_giver':
        return 'count';
      case 'chirp_times':
        return 'comments';
      case 'stream_binge':
        return 'hours';
      case 'daily_commentator':
        return 'streams';
      default:
        return 'count';
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
    const challenges = await Challenge.find({ isActive: true }).sort({ createdAt: -1 });
    return challenges;
  }

  /**
   * Admin: Get challenges list with dashboard metrics.
   */
  async getAdminChallenges(query: Record<string, string>) {
    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const limit = Math.max(parseInt(query.limit || '20', 10), 1);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.search) {
      filter.title = { $regex: query.search, $options: 'i' };
    }
    if (query.status === 'active') {
      filter.isActive = true;
    }
    if (query.status === 'inactive') {
      filter.isActive = false;
    }

    const [challenges, total] = await Promise.all([
      Challenge.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Challenge.countDocuments(filter),
    ]);

    const challengeIds = challenges.map((c: any) => c._id);

    const progressStats = await ChallengeProgress.aggregate([
      { $match: { challengeId: { $in: challengeIds } } },
      {
        $group: {
          _id: '$challengeId',
          participantIds: { $addToSet: '$userId' },
          completedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
            },
          },
        },
      },
    ]);

    const statMap = new Map<string, { participants: number; completedCount: number }>();
    progressStats.forEach((stat: any) => {
      statMap.set(String(stat._id), {
        participants: stat.participantIds.length,
        completedCount: stat.completedCount,
      });
    });

    const rows = challenges.map((challenge: any, index: number) => {
      const stat = statMap.get(String(challenge._id)) || { participants: 0, completedCount: 0 };
      const completionPercentage =
        stat.participants > 0
          ? Number(((stat.completedCount / stat.participants) * 100).toFixed(2))
          : 0;

      return {
        serial: skip + index + 1,
        ...challenge,
        participants: stat.participants,
        completionPercentage,
        status: challenge.isActive ? 'Active' : 'Inactive',
      };
    });

    return {
      challenges: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin: Get single challenge details with aggregate stats.
   */
  async getAdminChallengeById(challengeId: string) {
    const challenge = await Challenge.findById(challengeId).lean();
    if (!challenge) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Challenge not found');
    }

    const stats = await ChallengeProgress.aggregate([
      { $match: { challengeId: challenge._id } },
      {
        $group: {
          _id: '$challengeId',
          participantIds: { $addToSet: '$userId' },
          completedCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          inProgressCount: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          expiredCount: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
        },
      },
    ]);

    const summary = stats[0] || {
      participantIds: [],
      completedCount: 0,
      inProgressCount: 0,
      expiredCount: 0,
    };

    const participants = summary.participantIds.length;
    const completionPercentage =
      participants > 0
        ? Number(((summary.completedCount / participants) * 100).toFixed(2))
        : 0;

    return {
      ...challenge,
      participants,
      completedCount: summary.completedCount,
      inProgressCount: summary.inProgressCount,
      expiredCount: summary.expiredCount,
      completionPercentage,
      status: challenge.isActive ? 'Active' : 'Inactive',
    };
  }

  /**
   * Get user's challenge progress
   */
  async getUserProgress(userId: string) {
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
    const payload = {
      ...data,
      progressUnit: data.progressUnit || this.getProgressUnitFromType(data.type),
      challengeLevel: data.challengeLevel || 'rare',
      visibility: data.visibility || 'public',
      isActive: typeof data.isActive === 'boolean' ? data.isActive : true,
    };

    const challenge = await Challenge.create(payload);
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
