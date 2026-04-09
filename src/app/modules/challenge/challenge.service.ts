import AppError from '../../../errors/AppError.js';
import { StatusCodes } from 'http-status-codes';
import { Challenge, ChallengeProgress, ChallengeRanking } from './challenge.model.js';
import { Wallet } from '../wallet/wallet.model.js';

/**
 * Challenge Service - Handle challenge logic
 * Based on Figma design (Explore > Challenges)
 */
class ChallengeService {
  private readonly PROGRESS_WINDOW_MS = 24 * 60 * 60 * 1000;

  private parseBoolean(value: unknown, fallback: boolean) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      if (v === 'true') return true;
      if (v === 'false') return false;
    }
    return fallback;
  }

  private parseNumber(value: unknown, fallback?: number) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  }

  private normalizeChallengeTitle(inputTitle: string) {
    const title = String(inputTitle || '').trim();

    if (!title) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Challenge title is required');
    }

    return title;
  }

  private normalizeChallengeType(inputType: string) {
    const normalized = String(inputType || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const map: Record<string, 'send_gift' | 'feather_gift'> = {
      send_gift: 'send_gift',
      gift_giver: 'send_gift',
      gift: 'send_gift',
      feather_gift: 'feather_gift',
      chirp_times: 'feather_gift',
      stream_binge: 'feather_gift',
      daily_commentator: 'feather_gift',
      comment: 'feather_gift',
      watch_stream: 'feather_gift',
    };

    const type = map[normalized];
    if (!type) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        'Invalid challenge type. Use send_gift or feather_gift',
      );
    }

    return type;
  }

  private async getCurrentWindowStart(userId: string) {
    const nowMs = Date.now();

    const latestProgress: any = await ChallengeProgress.findOne({ userId })
      .sort({ challengeDate: -1 })
      .select('challengeDate')
      .lean();

    if (!latestProgress?.challengeDate) {
      return new Date(nowMs);
    }

    const latestStartMs = new Date(latestProgress.challengeDate).getTime();
    if (!Number.isFinite(latestStartMs)) {
      return new Date(nowMs);
    }

    const elapsed = nowMs - latestStartMs;
    if (elapsed < this.PROGRESS_WINDOW_MS) {
      return new Date(latestStartMs);
    }

    const windowsPassed = Math.floor(elapsed / this.PROGRESS_WINDOW_MS);
    return new Date(latestStartMs + windowsPassed * this.PROGRESS_WINDOW_MS);
  }

  private inferProgressUnit(type: 'send_gift' | 'feather_gift', title: string) {
    const normalized = String(title || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');

    if (type === 'send_gift') {
      return 'count';
    }

    if (normalized.includes('daily_commentator') || normalized.includes('daily_commentor')) {
      return 'streams';
    }
    if (normalized.includes('stream_binge') || normalized.includes('watch') || normalized.includes('hour')) {
      return 'hours';
    }
    if (normalized.includes('chirp') || normalized.includes('comment')) {
      return 'comments';
    }

    // Default feather challenge unit
    return 'comments';
  }

  private getProgressFilterByEvent(eventType: string) {
    const normalized = String(eventType || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (['gift_giver', 'send_gift', 'gift'].includes(normalized)) {
      return { type: 'send_gift', progressUnit: 'count' };
    }

    if (['chirp_times', 'comment', 'comments'].includes(normalized)) {
      return { type: 'feather_gift', progressUnit: 'comments' };
    }

    if (['stream_binge', 'watch_stream', 'watch_streams'].includes(normalized)) {
      return { type: 'feather_gift', progressUnit: 'hours' };
    }

    if (['daily_commentator', 'different_streamer_comment', 'different_streamers_comment'].includes(normalized)) {
      return { type: 'feather_gift', progressUnit: 'streams' };
    }

    return { type: this.normalizeChallengeType(normalized) };
  }

  private async expireOldProgress(windowStart: Date, userId?: string) {
    const filter: Record<string, unknown> = {
      challengeDate: { $lt: windowStart },
      status: 'in_progress',
    };

    if (userId) filter.userId = userId;

    await ChallengeProgress.updateMany(filter, { $set: { status: 'expired' } });
  }

  private async getOrCreateWindowProgress(
    userId: string,
    challengeId: string,
    windowStart: Date,
  ) {
    let progress = await ChallengeProgress.findOne({
      userId,
      challengeId,
      challengeDate: windowStart,
    });

    if (!progress) {
      progress = await ChallengeProgress.create({
        userId,
        challengeId,
        challengeDate: windowStart,
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
          featherBalance: challenge.featherReward,
          totalFeathersEarned: challenge.featherReward,
          // Legacy compatibility
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
          ? Math.round((stat.completedCount / stat.participants) * 100)
          : 0;

      const serialNum = skip + index + 1;

      return {
        id: String(serialNum).padStart(2, '0'),
        _id: challenge._id,
        title: challenge.title,
        reward: `${challenge.featherReward} Feather`,
        challengeLevel:
          challenge.challengeLevel
            ? challenge.challengeLevel.charAt(0).toUpperCase() + challenge.challengeLevel.slice(1)
            : 'Common',
        participants: stat.participants,
        completionPercentage: `${completionPercentage}%`,
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
    const windowStart = await this.getCurrentWindowStart(userId);
    await this.expireOldProgress(windowStart, userId);

    const challenges = await Challenge.find({ isActive: true }).sort({ createdAt: -1 });

    const progress = await ChallengeProgress.find({ userId, challengeDate: windowStart })
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
    const inProgressToday = Math.max(challenges.length - completedToday, 0);

    const uiChallenges = items.map((item: any) => {
      const current = Number(item.progress || 0);
      const target = Number(item.target || 0);
      const percentage = target > 0 ? Math.min(100, Number(((current / target) * 100).toFixed(2))) : 0;
      const isHourBased = item.challenge?.progressUnit === 'hours';

      return {
        id: item.challenge?._id,
        title: item.challenge?.title,
        description: item.challenge?.description,
        rewardFeathers: item.challenge?.featherReward || 0,
        progressCurrent: current,
        progressTarget: target,
        progressText: isHourBased
          ? `${percentage}%`
          : `${Math.floor(current)}/${Math.floor(target)}`,
        progressPercentage: percentage,
        status: item.status,
      };
    });

    return {
      date: windowStart,
      resetAt: new Date(windowStart.getTime() + this.PROGRESS_WINDOW_MS),
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
      ui: {
        overview: {
          completed: completedToday,
          inProgress: inProgressToday,
          earnedToday: totalEarnedToday,
          totalEarned: ranking?.totalFeathersEarned || 0,
        },
        challenges: uiChallenges,
      },
    };
  }

  /**
   * Get global rankings (leaderboard)
   */
  async getRankings(limit: number = 10) {
    const rankings = await ChallengeRanking.find()
      .populate('userId', 'name userName image country')
      .sort({ totalFeathersEarned: -1 })
      .limit(limit);

    const leaderboard = rankings.map((item: any, index: number) => ({
      rank: index + 1,
      userId: item.userId?._id || item.userId,
      name: item.userId?.name || item.userId?.userName || 'Unknown',
      avatar: item.userId?.image || '',
      feathers: item.totalFeathersEarned || 0,
      country: item.userId?.country || '',
    }));

    return {
      leaderboard
    };
  }

  /**
   * Update challenge progress (called from gift/comment/stream services)
   */
  async updateProgress(
    userId: string,
    challengeType: string,
    incrementBy: number = 1
  ) {
    const windowStart = await this.getCurrentWindowStart(userId);
    await this.expireOldProgress(windowStart, userId);

    const filter = this.getProgressFilterByEvent(challengeType);
    const challenges = await Challenge.find({ isActive: true, ...filter });

    for (const challenge of challenges) {
      const progress = await this.getOrCreateWindowProgress(
        userId,
        String((challenge as any)._id),
        windowStart,
      );
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
    const windowStart = await this.getCurrentWindowStart(userId);
    await this.expireOldProgress(windowStart, userId);

    const challenges = await Challenge.find({
      isActive: true,
      type: 'feather_gift',
      progressUnit: 'streams',
    });

    for (const challenge of challenges) {
      const progress = await this.getOrCreateWindowProgress(
        userId,
        String((challenge as any)._id),
        windowStart,
      );
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
    const windowStart = await this.getCurrentWindowStart(userId);
    await this.expireOldProgress(windowStart, userId);

    const challenges = await Challenge.find({
      isActive: true,
      type: 'feather_gift',
      progressUnit: 'hours',
    });

    for (const challenge of challenges) {
      const progress = await this.getOrCreateWindowProgress(
        userId,
        String((challenge as any)._id),
        windowStart,
      );
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
    const windowStart = await this.getCurrentWindowStart(userId);
    await this.expireOldProgress(windowStart, userId);

    const challenges = await Challenge.find({
      isActive: true,
      type: 'feather_gift',
      progressUnit: 'hours',
    });

    for (const challenge of challenges) {
      const progress = await this.getOrCreateWindowProgress(
        userId,
        String((challenge as any)._id),
        windowStart,
      );
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
    const normalizedTitle = this.normalizeChallengeTitle(data.title);
    const normalizedType = this.normalizeChallengeType(data.type);
    const targetAmount = this.parseNumber(data.targetAmount);
    const featherReward = this.parseNumber(data.featherReward);

    if (!targetAmount || targetAmount < 1) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'targetAmount must be a positive number');
    }

    if (!featherReward || featherReward < 1) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'featherReward must be a positive number');
    }

    const payload = {
      ...data,
      title: normalizedTitle,
      type: normalizedType,
      targetAmount,
      featherReward,
      requiredDays: this.parseNumber(data.requiredDays),
      progressUnit: data.progressUnit || this.inferProgressUnit(normalizedType, normalizedTitle),
      challengeLevel: data.challengeLevel || 'rare',
      visibility: data.visibility || 'public',
      isActive: this.parseBoolean(data.isActive, true),
    };

    const challenge = await Challenge.create(payload);
    return challenge;
  }

  /**
   * Admin: Update a challenge
   */
  async updateChallenge(challengeId: string, data: any) {
    const payload = { ...data };
    let normalizedTitle: string | undefined;
    let normalizedType: 'send_gift' | 'feather_gift' | undefined;

    if (payload.title) {
      normalizedTitle = this.normalizeChallengeTitle(payload.title);
      payload.title = normalizedTitle;
    }

    if (payload.type) {
      normalizedType = this.normalizeChallengeType(payload.type);
      payload.type = normalizedType;
    }

    if (!payload.progressUnit && (normalizedTitle || normalizedType)) {
      const existing = await Challenge.findById(challengeId).lean();
      if (!existing) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Challenge not found');
      }

      payload.progressUnit = this.inferProgressUnit(
        (normalizedType || existing.type) as 'send_gift' | 'feather_gift',
        normalizedTitle || existing.title,
      );
    }

    if (typeof payload.targetAmount !== 'undefined') {
      const parsedTarget = this.parseNumber(payload.targetAmount);
      if (!parsedTarget || parsedTarget < 1) {
        throw new AppError(StatusCodes.BAD_REQUEST, 'targetAmount must be a positive number');
      }
      payload.targetAmount = parsedTarget;
    }

    if (typeof payload.featherReward !== 'undefined') {
      const parsedReward = this.parseNumber(payload.featherReward);
      if (!parsedReward || parsedReward < 1) {
        throw new AppError(StatusCodes.BAD_REQUEST, 'featherReward must be a positive number');
      }
      payload.featherReward = parsedReward;
    }

    if (typeof payload.requiredDays !== 'undefined') {
      payload.requiredDays = this.parseNumber(payload.requiredDays);
    }

    if (typeof payload.isActive !== 'undefined') {
      payload.isActive = this.parseBoolean(payload.isActive, true);
    }

    const challenge = await Challenge.findByIdAndUpdate(challengeId, payload, { new: true });
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
