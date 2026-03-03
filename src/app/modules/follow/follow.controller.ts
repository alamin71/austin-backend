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

          // Transform avatar → image for each follower and remove avatar field
          const transformedResult = (result || []).map((follower: any) => {
               const plainData = follower && (follower as any).toObject ? (follower as any).toObject() : follower;
               const transformed = {
                    ...plainData,
                    image: plainData?.avatar,
               };
               // Remove avatar field completely
               delete transformed.avatar;
               return transformed;
          });

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Followers retrieved',
               data: transformedResult,
          });
     }),

     getFollowing: catchAsync(async (req: Request, res: Response) => {
          const userId = req.params.userId || (req.user as any).id;
          const result = await FollowService.getFollowing(userId);

          // Transform avatar → image for each following user and remove avatar field
          const transformedResult = (result || []).map((following: any) => {
               const plainData = following && (following as any).toObject ? (following as any).toObject() : following;
               const transformed = {
                    ...plainData,
                    image: plainData?.avatar,
               };
               // Remove avatar field completely
               delete transformed.avatar;
               return transformed;
          });

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Following list retrieved',
               data: transformedResult,
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
