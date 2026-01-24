import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import { StatusCodes } from 'http-status-codes';
import AnalyticsService from './analytics.service.js';
import AppError from '../../../errors/AppError.js';
import { USER_ROLES } from '../../../enums/user.js';

class AnalyticsController {
     /**
      * Get platform-wide analytics (Admin only)
      */
     getPlatformAnalytics = catchAsync(async (req: Request, res: Response) => {
          const { startDate, endDate } = req.query;

          let dateRange;
          if (startDate && endDate) {
               dateRange = {
                    startDate: new Date(startDate as string),
                    endDate: new Date(endDate as string),
               };
          }

          const analytics = await AnalyticsService.getPlatformAnalytics(dateRange);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Platform analytics retrieved successfully',
               data: analytics,
          });
     });

     /**
      * Get streamer dashboard analytics
      */
     getStreamerDashboard = catchAsync(async (req: Request, res: Response) => {
          const { streamerId } = req.params;
          const { startDate, endDate } = req.query;
          const userId = (req.user as any)?._id || (req.user as any)?.id;

          // Check if user is requesting their own analytics or is admin
          if (streamerId !== userId.toString() && (req.user as any)?.role !== USER_ROLES.ADMIN) {
               throw new AppError(StatusCodes.FORBIDDEN, 'You can only view your own analytics');
          }

          let dateRange;
          if (startDate && endDate) {
               dateRange = {
                    startDate: new Date(startDate as string),
                    endDate: new Date(endDate as string),
               };
          }

          const dashboard = await AnalyticsService.getStreamerDashboard(streamerId, dateRange);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Streamer dashboard retrieved successfully',
               data: dashboard,
          });
     });

     /**
      * Get my dashboard (current user)
      */
     getMyDashboard = catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any)?._id || (req.user as any)?.id;
          const { startDate, endDate } = req.query;

          if (!userId) {
               throw new AppError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
          }

          let dateRange;
          if (startDate && endDate) {
               dateRange = {
                    startDate: new Date(startDate as string),
                    endDate: new Date(endDate as string),
               };
          }

          const dashboard = await AnalyticsService.getStreamerDashboard(userId.toString(), dateRange);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Dashboard retrieved successfully',
               data: dashboard,
          });
     });

     /**
      * Get real-time analytics
      */
     getRealtimeAnalytics = catchAsync(async (req: Request, res: Response) => {
          const analytics = await AnalyticsService.getRealtimeAnalytics();

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Real-time analytics retrieved successfully',
               data: analytics,
          });
     });

     /**
      * Get category analytics
      */
     getCategoryAnalytics = catchAsync(async (req: Request, res: Response) => {
          const { categoryId } = req.params;
          const { startDate, endDate } = req.query;

          let dateRange;
          if (startDate && endDate) {
               dateRange = {
                    startDate: new Date(startDate as string),
                    endDate: new Date(endDate as string),
               };
          }

          const analytics = await AnalyticsService.getCategoryAnalytics(categoryId, dateRange);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Category analytics retrieved successfully',
               data: analytics,
          });
     });

     /**
      * Get comparison analytics (This month vs Last month)
      */
     getComparisonAnalytics = catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any)?._id || (req.user as any)?.id;
          const { streamerId } = req.query;

          // If streamerId provided, check permission
          let targetStreamerId = streamerId as string | undefined;
          if (targetStreamerId && targetStreamerId !== userId?.toString() && (req.user as any)?.role !== USER_ROLES.ADMIN) {
               throw new AppError(StatusCodes.FORBIDDEN, 'You can only view your own analytics');
          }

          // If no streamerId, use current user
          if (!targetStreamerId && userId) {
               targetStreamerId = userId.toString();
          }

          const analytics = await AnalyticsService.getComparisonAnalytics(targetStreamerId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Comparison analytics retrieved successfully',
               data: analytics,
          });
     });
}

export default new AnalyticsController();
