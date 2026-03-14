import { User } from '../user/user.model.js';
import { Stream } from '../stream/stream.model.js';
import { Moment } from '../moment/moment.model.js';

/**
 * Returns a merged, time-sorted feed of:
 *  - Live & recent streams
 *  - Recent moments/posts
 *
 * Tab "friends": limited to the current user's friends + following network
 * Tab "all"    : all public content
 */
const getFeed = async (
  userId: string,
  tab: 'all' | 'friends',
  page = 1,
  limit = 20,
) => {
  const skip = (page - 1) * limit;
  const networkIds: string[] = [userId];

  if (tab === 'friends') {
    const user = await User.findById(userId).select('friends following').lean();
    user?.friends?.forEach((id) => networkIds.push(id.toString()));
    user?.following?.forEach((id) => networkIds.push(id.toString()));
  }

  const networkFilter =
    tab === 'friends' ? { $in: networkIds } : undefined;

  // ── Fetch live + recently ended streams ─────────────────────────────────
  const streamFilter: Record<string, unknown> = {
    status: { $in: ['live', 'ended'] },
  };
  if (networkFilter) streamFilter.streamer = networkFilter;

  // ── Fetch moments ────────────────────────────────────────────────────────
  const momentFilter: Record<string, unknown> = { isDeleted: false };
  if (networkFilter) momentFilter.author = networkFilter;

  const [streams, moments] = await Promise.all([
    Stream.find(streamFilter)
      .populate('streamer', 'name userName image verified')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 2)       // fetch extra so merge is good
      .lean(),
    Moment.find(momentFilter)
      .populate('author', 'name userName image verified')
      .sort({ createdAt: -1 })
      .limit(limit * 2)
      .lean(),
  ]);

  // ── Tag and merge ────────────────────────────────────────────────────────
  const streamItems = streams.map((s) => ({
    type: 'stream' as const,
    createdAt: s.createdAt,
    data: s,
  }));

  const momentItems = moments.map((m) => ({
    type: 'moment' as const,
    createdAt: m.createdAt,
    data: {
      ...m,
      isLiked: m.likes.some((id: unknown) => id!.toString() === userId),
      isSaved: m.saves.some((id: unknown) => id!.toString() === userId),
    },
  }));

  const merged = [...streamItems, ...momentItems].sort(
    (a, b) =>
      new Date(b.createdAt as Date).getTime() -
      new Date(a.createdAt as Date).getTime(),
  );

  const paginated = merged.slice(skip, skip + limit);
  const total = merged.length;

  return {
    feed: paginated,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Returns only the currently live streams (for the "Live" card row)
 */
const getLiveStreams = async (
  userId: string,
  tab: 'all' | 'friends',
  limit = 10,
) => {
  const networkIds: string[] = [userId];

  if (tab === 'friends') {
    const user = await User.findById(userId).select('friends following').lean();
    user?.friends?.forEach((id) => networkIds.push(id.toString()));
    user?.following?.forEach((id) => networkIds.push(id.toString()));
  }

  const streamFilter: Record<string, unknown> = { status: 'live' };
  if (tab === 'friends') streamFilter.streamer = { $in: networkIds };

  return Stream.find(streamFilter)
    .populate('streamer', 'name userName image verified')
    .populate('category', 'name')
    .sort({ currentViewerCount: -1 })
    .limit(limit)
    .lean();
};

export const CommunityPulseService = {
  getFeed,
  getLiveStreams,
};
