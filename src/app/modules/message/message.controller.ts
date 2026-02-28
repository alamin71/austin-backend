import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import { MessageService } from './message.service.js';

export const MessageController = {
     sendMessage: catchAsync(async (req: Request, res: Response) => {
          const { receiverId, content, type, mediaUrl } = req.body;
          const senderId = (req.user as any).id;

          const result = await MessageService.sendMessage(
               senderId,
               receiverId,
               content,
               type,
               mediaUrl,
          );

          sendResponse(res, {
               statusCode: StatusCodes.CREATED,
               success: true,
               message: 'Message sent successfully',
               data: result,
          });
     }),

     getConversation: catchAsync(async (req: Request, res: Response) => {
          const { otherUserId } = req.params;
          const userId = (req.user as any).id;
          const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

          const result = await MessageService.getConversation(
               userId,
               otherUserId,
               limit,
          );

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Conversation retrieved',
               data: result,
          });
     }),

     getConversationsList: catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any).id;
          const result = await MessageService.getConversationsList(userId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Conversations list retrieved',
               data: result,
          });
     }),

     markAsRead: catchAsync(async (req: Request, res: Response) => {
          const { otherUserId } = req.params;
          const userId = (req.user as any).id;

          const result = await MessageService.markAsRead(userId, otherUserId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Messages marked as read',
               data: result,
          });
     }),

     getUnreadCount: catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any).id;
          const result = await MessageService.getUnreadCount(userId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Unread count retrieved',
               data: result,
          });
     }),

     deleteMessage: catchAsync(async (req: Request, res: Response) => {
          const { messageId } = req.params;
          const userId = (req.user as any).id;

          const result = await MessageService.deleteMessage(messageId, userId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: result.message,
               data: {},
          });
     }),

     blockUser: catchAsync(async (req: Request, res: Response) => {
          const { blockUserId } = req.params;
          const userId = (req.user as any).id;

          const result = await MessageService.blockUser(userId, blockUserId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: result.message,
               data: {},
          });
     }),

     unblockUser: catchAsync(async (req: Request, res: Response) => {
          const { unblockUserId } = req.params;
          const userId = (req.user as any).id;

          const result = await MessageService.unblockUser(
               userId,
               unblockUserId,
          );

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: result.message,
               data: {},
          });
     }),

     getBlockedUsers: catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any).id;

          const result = await MessageService.getBlockedUsers(userId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Blocked users list retrieved',
               data: result,
          });
     }),

     isUserBlocked: catchAsync(async (req: Request, res: Response) => {
          const { checkUserId } = req.params;
          const userId = (req.user as any).id;

          const result = await MessageService.isUserBlocked(userId, checkUserId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Block status retrieved',
               data: result,
          });
     }),
};
