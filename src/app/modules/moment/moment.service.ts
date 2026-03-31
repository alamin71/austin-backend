import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError.js';
import { Moment, MomentComment } from './moment.model.js';
import { uploadFileToS3 } from '../../../helpers/s3Helper.js';
import { User } from '../user/user.model.js';
import config from '../../../config/index.js';

const formatTimeAgo = (value?: Date | string) => {
  if (!value) return '';

  const createdTime = new Date(value).getTime();
  if (Number.isNaN(createdTime)) return '';

  const diffInSeconds = Math.max(0, Math.floor((Date.now() - createdTime) / 1000));

  if (diffInSeconds < 60) return `${diffInSeconds || 1} sec ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 5) return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
};

const normalizeAuthor = (author: any) => {
  const name = author?.name || author?.userName || '';
  const photo = author?.image || null;

  return {
    ...author,
    displayName: name,
    photo,
  };
};

const createMoment = async (
  authorId: string,
  description: string | undefined,
  files: Express.Multer.File[],
) => {
  if (!description?.trim() && (!files || files.length === 0)) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Moment must have a description or at least one media file',
    );
  }

  const media: { url: string; type: 'image' | 'video' }[] = [];
  for (const file of files || []) {
    const url = await uploadFileToS3(file, 'moments');
    const type: 'image' | 'video' = file.mimetype.startsWith('video/') ? 'video' : 'image';
    media.push({ url, type });
  }

  const moment = await Moment.create({ author: authorId, description, media });
  return Moment.findById(moment._id).populate('author', 'name userName image verified');
};

const getMoments = async (
  userId: string,
  tab: 'all' | 'friends',
  page = 1,
  limit = 20,
) => {
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = { isDeleted: false };

  if (tab === 'friends') {
    const user = await User.findById(userId).select('friends following').lean();
    const network = [
      ...(user?.friends?.map((id) => id.toString()) || []),
      ...(user?.following?.map((id) => id.toString()) || []),
      userId,
    ];
    filter.author = { $in: network };
  }

  const [moments, total] = await Promise.all([
    Moment.find(filter)
      .populate('author', 'name userName image verified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Moment.countDocuments(filter),
  ]);

  const enriched = moments.map((m) => ({
    ...m,
    author: normalizeAuthor(m.author),
    userName: (m.author as any)?.name || (m.author as any)?.userName || '',
    userPhoto: (m.author as any)?.image || null,
    timeAgo: formatTimeAgo(m.createdAt),
    isLiked: m.likes.some((id: unknown) => id!.toString() === userId),
    isSaved: m.saves.some((id: unknown) => id!.toString() === userId),
  }));

  return {
    moments: enriched,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getMomentById = async (momentId: string, userId: string) => {
  const moment = await Moment.findOne({ _id: momentId, isDeleted: false })
    .populate('author', 'name userName image verified')
    .lean();

  if (!moment) throw new AppError(StatusCodes.NOT_FOUND, 'Moment not found');

  return {
    ...moment,
    isLiked: moment.likes.some((id: unknown) => id!.toString() === userId),
    isSaved: moment.saves.some((id: unknown) => id!.toString() === userId),
  };
};

const toggleLike = async (momentId: string, userId: string) => {
  const moment = await Moment.findOne({ _id: momentId, isDeleted: false });
  if (!moment) throw new AppError(StatusCodes.NOT_FOUND, 'Moment not found');

  const idx = moment.likes.findIndex((id) => id.toString() === userId);
  let liked: boolean;
  if (idx === -1) {
    moment.likes.push(userId as any);
    liked = true;
  } else {
    moment.likes.splice(idx, 1);
    liked = false;
  }
  moment.likesCount = moment.likes.length;
  await moment.save();

  const payload = { liked, likesCount: moment.likesCount };

  // Real-time: broadcast updated like count to everyone watching this moment
  const socketIo = (global as any).io;
  if (socketIo) {
    socketIo.emit(`moment::like::${momentId}`, payload);
  }

  return payload;
};

const addComment = async (momentId: string, authorId: string, text: string) => {
  const moment = await Moment.findOne({ _id: momentId, isDeleted: false });
  if (!moment) throw new AppError(StatusCodes.NOT_FOUND, 'Moment not found');

  const comment = await MomentComment.create({ moment: momentId, author: authorId, text });
  await Moment.findByIdAndUpdate(momentId, { $inc: { commentsCount: 1 } });

  const populated = await MomentComment.findById(comment._id).populate(
    'author',
    'name userName image',
  );

  // Real-time: broadcast new comment to everyone watching this moment
  const socketIo = (global as any).io;
  if (socketIo) {
    socketIo.emit(`moment::comment::${momentId}`, populated);
  }

  return populated;
};

const getComments = async (momentId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [comments, total] = await Promise.all([
    MomentComment.find({ moment: momentId, isDeleted: false })
      .populate('author', 'name userName image')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    MomentComment.countDocuments({ moment: momentId, isDeleted: false }),
  ]);

  const enrichedComments = comments.map((comment) => ({
    ...comment,
    author: normalizeAuthor(comment.author),
    userName: (comment.author as any)?.name || (comment.author as any)?.userName || '',
    userPhoto: (comment.author as any)?.image || null,
    timeAgo: formatTimeAgo(comment.createdAt),
  }));

  return {
    comments: enrichedComments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const toggleCommentLike = async (commentId: string, userId: string) => {
  const comment = await MomentComment.findOne({ _id: commentId, isDeleted: false });
  if (!comment) throw new AppError(StatusCodes.NOT_FOUND, 'Comment not found');

  const idx = comment.likes.findIndex((id) => id.toString() === userId);
  let liked: boolean;
  if (idx === -1) {
    comment.likes.push(userId as any);
    liked = true;
  } else {
    comment.likes.splice(idx, 1);
    liked = false;
  }
  comment.likesCount = comment.likes.length;
  await comment.save();

  return { liked, likesCount: comment.likesCount };
};

const deleteMoment = async (momentId: string, userId: string) => {
  const moment = await Moment.findOne({ _id: momentId, isDeleted: false });
  if (!moment) throw new AppError(StatusCodes.NOT_FOUND, 'Moment not found');
  if (moment.author.toString() !== userId) {
    throw new AppError(StatusCodes.FORBIDDEN, 'You cannot delete this moment');
  }
  moment.isDeleted = true;
  await moment.save();
  return { message: 'Moment deleted successfully' };
};

const toggleSave = async (momentId: string, userId: string) => {
  const moment = await Moment.findOne({ _id: momentId, isDeleted: false });
  if (!moment) throw new AppError(StatusCodes.NOT_FOUND, 'Moment not found');

  const idx = moment.saves.findIndex((id) => id.toString() === userId);
  let saved: boolean;
  if (idx === -1) {
    moment.saves.push(userId as any);
    saved = true;
  } else {
    moment.saves.splice(idx, 1);
    saved = false;
  }
  await moment.save();
  return { saved, savesCount: moment.saves.length };
};

const shareMoment = async (momentId: string) => {
  const moment = await Moment.findOne({ _id: momentId, isDeleted: false });
  if (!moment) throw new AppError(StatusCodes.NOT_FOUND, 'Moment not found');

  moment.sharesCount = (moment.sharesCount || 0) + 1;
  await moment.save();

  const baseUrl = config.frontend_url || config.backend_url || '';
  const shareUrl = baseUrl ? `${baseUrl}/moment/${moment._id}` : `/moment/${moment._id}`;

  return {
    momentId: moment._id,
    shareUrl,
    sharesCount: moment.sharesCount,
  };
};

const getUserMoments = async (profileUserId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [moments, total] = await Promise.all([
    Moment.find({ author: profileUserId, isDeleted: false })
      .populate('author', 'name userName image verified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Moment.countDocuments({ author: profileUserId, isDeleted: false }),
  ]);

  return {
    moments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getSavedMoments = async (userId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [moments, total] = await Promise.all([
    Moment.find({ saves: userId, isDeleted: false })
      .populate('author', 'name userName image verified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Moment.countDocuments({ saves: userId, isDeleted: false }),
  ]);

  return {
    moments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const MomentService = {
  createMoment,
  getMoments,
  getMomentById,
  toggleLike,
  addComment,
  getComments,
  toggleCommentLike,
  deleteMoment,
  toggleSave,
  shareMoment,
  getUserMoments,
  getSavedMoments,
};
