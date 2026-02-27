import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import { NotificationService } from './notification.service.js';

export const NotificationController = {
     getNotifications: catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any).id;
          const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
          const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;

          const result = await NotificationService.getNotifications(
               userId,
               limit,
               skip,
          );

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Notifications retrieved',
               data: result,
          });
     }),

     getUnreadCount: catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any).id;
          const result = await NotificationService.getUnreadCount(userId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Unread count retrieved',
               data: result,
          });
     }),

     markAsRead: catchAsync(async (req: Request, res: Response) => {
          const { notificationId } = req.params;

          const result = await NotificationService.markAsRead(notificationId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Notification marked as read',
               data: result,
          });
     }),

     markAllAsRead: catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any).id;

          const result = await NotificationService.markAllAsRead(userId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: result.message,
               data: {},
          });
     }),

     deleteNotification: catchAsync(async (req: Request, res: Response) => {
          const { notificationId } = req.params;

          const result = await NotificationService.deleteNotification(
               notificationId,
          );

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: result.message,
               data: {},
          });
     }),

     clearAllNotifications: catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any).id;

          const result = await NotificationService.clearAllNotifications(userId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: result.message,
               data: {},
          });
     }),
};
