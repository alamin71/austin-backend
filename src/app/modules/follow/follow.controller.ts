import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import { FollowService } from './follow.service.js';

export const FollowController = {
     followUser: catchAsync(async (req: Request, res: Response) => {
          const { followingId } = req.body;
          const followerId = (req.user as any).id;

          const result = await FollowService.followUser(followerId, followingId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: result.message,
               data: {},
          });
     }),

     unfollowUser: catchAsync(async (req: Request, res: Response) => {
          const { followingId } = req.body;
          const followerId = (req.user as any).id;

          const result = await FollowService.unfollowUser(
               followerId,
               followingId,
          );

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: result.message,
               data: {},
          });
     }),

     getFollowers: catchAsync(async (req: Request, res: Response) => {
          const userId = req.params.userId || (req.user as any).id;
          const result = await FollowService.getFollowers(userId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Followers retrieved',
               data: result,
          });
     }),

     getFollowing: catchAsync(async (req: Request, res: Response) => {
          const userId = req.params.userId || (req.user as any).id;
          const result = await FollowService.getFollowing(userId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Following list retrieved',
               data: result,
          });
     }),

     isFollowing: catchAsync(async (req: Request, res: Response) => {
          const { followingId } = req.params;
          const followerId = (req.user as any).id;

          const result = await FollowService.isFollowing(
               followerId,
               followingId,
          );

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Status retrieved',
               data: { isFollowing: result },
          });
     }),
};
