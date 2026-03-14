import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError.js';
import { Moment, MomentComment } from './moment.model.js';
import { uploadFileToS3 } from '../../../helpers/s3Helper.js';
import { User } from '../user/user.model.js';

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

  return { liked, likesCount: moment.likesCount };
};

const addComment = async (momentId: string, authorId: string, text: string) => {
  const moment = await Moment.findOne({ _id: momentId, isDeleted: false });
  if (!moment) throw new AppError(StatusCodes.NOT_FOUND, 'Moment not found');

  const comment = await MomentComment.create({ moment: momentId, author: authorId, text });
  await Moment.findByIdAndUpdate(momentId, { $inc: { commentsCount: 1 } });

  return MomentComment.findById(comment._id).populate('author', 'name userName image');
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

  return {
    comments,
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
  getUserMoments,
  getSavedMoments,
};
