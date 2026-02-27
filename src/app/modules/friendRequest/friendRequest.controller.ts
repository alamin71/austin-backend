import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import { FriendRequestService } from './friendRequest.service.js';

export const FriendRequestController = {
     sendFriendRequest: catchAsync(async (req: Request, res: Response) => {
          const { receiverId } = req.body;
          const senderId = (req.user as any).id;

          const result = await FriendRequestService.sendFriendRequest(
               senderId,
               receiverId,
          );

          sendResponse(res, {
               statusCode: StatusCodes.CREATED,
               success: true,
               message: 'Friend request sent successfully',
               data: result,
          });
     }),

     getPendingRequests: catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any).id;
          const result = await FriendRequestService.getPendingRequests(userId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Pending requests retrieved',
               data: result,
          });
     }),

     acceptFriendRequest: catchAsync(async (req: Request, res: Response) => {
          const { requestId } = req.params;
          const userId = (req.user as any).id;

          const result = await FriendRequestService.acceptFriendRequest(
               requestId,
               userId,
          );

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Friend request accepted',
               data: result,
          });
     }),

     rejectFriendRequest: catchAsync(async (req: Request, res: Response) => {
          const { requestId } = req.params;
          const userId = (req.user as any).id;

          const result = await FriendRequestService.rejectFriendRequest(
               requestId,
               userId,
          );

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Friend request rejected',
               data: result,
          });
     }),

     getFriendsList: catchAsync(async (req: Request, res: Response) => {
          const userId = req.params.userId || (req.user as any).id;
          const result = await FriendRequestService.getFriendsList(userId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Friends list retrieved',
               data: result,
          });
     }),

     removeFriend: catchAsync(async (req: Request, res: Response) => {
          const { friendId } = req.params;
          const userId = (req.user as any).id;

          const result = await FriendRequestService.removeFriend(
               userId,
               friendId,
          );

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: result.message,
               data: {},
          });
     }),
};
