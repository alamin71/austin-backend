import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import { MomentService } from './moment.service.js';

/** POST /moment  – share a new moment (text + optional media) */
const createMoment = catchAsync(async (req: Request, res: Response) => {
  const authorId = (req.user as any).id;
  const description = req.body.description as string | undefined;
  const files = (req.files as Express.Multer.File[]) || [];

  const result = await MomentService.createMoment(authorId, description, files);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Moment shared successfully',
    data: result,
  });
});

/** GET /moment?tab=all|friends&page=1&limit=20 – feed */
const getMoments = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const tab = (req.query.tab as 'all' | 'friends') || 'all';
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await MomentService.getMoments(userId, tab, page, limit);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Moments retrieved successfully',
    data: result,
  });
});

/** GET /moment/saved – current user's saved moments */
const getSavedMoments = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await MomentService.getSavedMoments(userId, page, limit);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Saved moments retrieved successfully',
    data: result,
  });
});

/** GET /moment/user/:userId – moments by a specific user */
const getUserMoments = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await MomentService.getUserMoments(userId, page, limit);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User moments retrieved successfully',
    data: result,
  });
});

/** GET /moment/my – current user's own moments */
const getMyMoments = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await MomentService.getUserMoments(userId, page, limit);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'My moments retrieved successfully',
    data: result,
  });
});

/** GET /moment/:momentId – single moment detail */
const getMomentById = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const { momentId } = req.params;

  const result = await MomentService.getMomentById(momentId, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Moment retrieved successfully',
    data: result,
  });
});

/** POST /moment/:momentId/like – toggle like */
const toggleLike = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const { momentId } = req.params;

  const result = await MomentService.toggleLike(momentId, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.liked ? 'Moment liked' : 'Moment unliked',
    data: result,
  });
});

/** POST /moment/:momentId/comment – add a comment */
const addComment = catchAsync(async (req: Request, res: Response) => {
  const authorId = (req.user as any).id;
  const { momentId } = req.params;
  const { text } = req.body;

  const result = await MomentService.addComment(momentId, authorId, text);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Comment added successfully',
    data: result,
  });
});

/** GET /moment/:momentId/comments – list comments */
const getComments = catchAsync(async (req: Request, res: Response) => {
  const { momentId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await MomentService.getComments(momentId, page, limit);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Comments retrieved successfully',
    data: result,
  });
});

/** POST /moment/comment/:commentId/like – toggle comment like */
const toggleCommentLike = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const { commentId } = req.params;

  const result = await MomentService.toggleCommentLike(commentId, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.liked ? 'Comment liked' : 'Comment unliked',
    data: result,
  });
});

/** POST /moment/:momentId/save – toggle save */
const toggleSave = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const { momentId } = req.params;

  const result = await MomentService.toggleSave(momentId, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.saved ? 'Moment saved' : 'Moment unsaved',
    data: result,
  });
});

/** POST /moment/:momentId/share – generate share link and track share count */
const shareMoment = catchAsync(async (req: Request, res: Response) => {
  const { momentId } = req.params;

  const result = await MomentService.shareMoment(momentId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Moment share link generated successfully',
    data: result,
  });
});

/** DELETE /moment/:momentId – delete own moment */
const deleteMoment = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const { momentId } = req.params;

  const result = await MomentService.deleteMoment(momentId, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.message,
    data: {},
  });
});

/** PATCH /moment/my/:momentId – update own moment */
const updateMyMoment = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const { momentId } = req.params;
  const description = req.body.description as string | undefined;
  const replaceMedia =
    req.body.replaceMedia === true ||
    req.body.replaceMedia === 'true' ||
    req.body.replaceMedia === 1 ||
    req.body.replaceMedia === '1';
  const files = (req.files as Express.Multer.File[]) || [];

  const result = await MomentService.updateMyMoment(momentId, userId, {
    description,
    replaceMedia,
    files,
  });

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Moment updated successfully',
    data: result,
  });
});

/** DELETE /moment/my/:momentId – delete own moment */
const deleteMyMoment = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const { momentId } = req.params;

  const result = await MomentService.deleteMoment(momentId, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.message,
    data: {},
  });
});

export const MomentController = {
  createMoment,
  getMoments,
  getSavedMoments,
  getMyMoments,
  getUserMoments,
  getMomentById,
  toggleLike,
  addComment,
  getComments,
  toggleCommentLike,
  toggleSave,
  shareMoment,
  updateMyMoment,
  deleteMyMoment,
  deleteMoment,
};
