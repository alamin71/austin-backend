import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import { CommunityPulseService } from './communityPulse.service.js';

/**
 * GET /community-pulse?tab=all|friends&page=1&limit=20
 *
 * Returns a time-sorted mixed feed of live streams + moments.
 * tab=all    → content from everyone
 * tab=friends → content from people the current user follows/is friends with
 */
const getFeed = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const tab = (req.query.tab as 'all' | 'friends') || 'all';
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await CommunityPulseService.getFeed(userId, tab, page, limit);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Community pulse feed retrieved successfully',
    data: result,
  });
});

/**
 * GET /community-pulse/live?tab=all|friends
 *
 * Returns currently live streams (used for the Live card row in the UI).
 */
const getLiveStreams = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const tab = (req.query.tab as 'all' | 'friends') || 'all';
  const limit = parseInt(req.query.limit as string) || 10;

  const result = await CommunityPulseService.getLiveStreams(userId, tab, limit);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Live streams retrieved successfully',
    data: result,
  });
});

export const CommunityPulseController = {
  getFeed,
  getLiveStreams,
};
