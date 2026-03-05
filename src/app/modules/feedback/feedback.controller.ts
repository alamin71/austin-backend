import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import { FeedbackService } from './feedback.service.js';

const createFeedback = catchAsync(async (req: Request, res: Response) => {
     const userId = (req.user as any).id;
     const result = await FeedbackService.createFeedback(userId, req.body);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.CREATED,
          message: 'Feedback submitted successfully',
          data: result,
     });
});

const getAllFeedbacks = catchAsync(async (req: Request, res: Response) => {
     const result = await FeedbackService.getAllFeedbacks();

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Feedbacks retrieved successfully',
          data: result,
     });
});

const getFeedbackById = catchAsync(async (req: Request, res: Response) => {
     const { feedbackId } = req.params;
     const result = await FeedbackService.getFeedbackById(feedbackId);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Feedback details retrieved successfully',
          data: result,
     });
});

const getUserFeedbacks = catchAsync(async (req: Request, res: Response) => {
     const userId = (req.user as any).id;
     const result = await FeedbackService.getUserFeedbacks(userId);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Your feedbacks retrieved successfully',
          data: result,
     });
});

const deleteFeedback = catchAsync(async (req: Request, res: Response) => {
     const { feedbackId } = req.params;
     const userId = (req.user as any).id;
     const userRole = (req.user as any).role;

     const result = await FeedbackService.deleteFeedback(feedbackId, userId, userRole);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: result.message,
          data: {},
     });
});

export const FeedbackController = {
     createFeedback,
     getAllFeedbacks,
     getFeedbackById,
     getUserFeedbacks,
     deleteFeedback,
};
