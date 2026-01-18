import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import StreamService from './stream.service';
import AppError from '../../../errors/AppError';

class StreamController {
     startStream = catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any)?._id || (req.user as any)?.id;
          const streamData = req.body;

          if (!userId) {
               throw new AppError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
          }

          const stream = await StreamService.startStream(userId, streamData);

          sendResponse(res, {
               statusCode: StatusCodes.CREATED,
               success: true,
               message: 'Stream started successfully',
               data: stream,
          });
     });

     endStream = catchAsync(async (req: Request, res: Response) => {
          const { streamId } = req.params;

          const stream = await StreamService.endStream(streamId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Stream ended successfully',
               data: stream,
          });
     });

     getStreamDetails = catchAsync(async (req: Request, res: Response) => {
          const { streamId } = req.params;

          const stream = await StreamService.getStreamDetails(streamId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Stream details retrieved successfully',
               data: stream,
          });
     });

     getLiveStreams = catchAsync(async (req: Request, res: Response) => {
          const page = parseInt(req.query.page as string) || 1;
          const limit = parseInt(req.query.limit as string) || 20;
          const category = req.query.category as string;

          const result = await StreamService.getLiveStreams(page, limit, category);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Live streams retrieved successfully',
               data: result.data,
               meta: {
                    page: result.pagination.page,
                    limit: result.pagination.limit,
                    total: result.pagination.total,
                    totalPage: result.pagination.pages,
               },
          });
     });

     getStreamerHistory = catchAsync(async (req: Request, res: Response) => {
          const { streamerId } = req.params;
          const page = parseInt(req.query.page as string) || 1;
          const limit = parseInt(req.query.limit as string) || 10;

          const result = await StreamService.getStreamerHistory(streamerId, page, limit);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Streamer history retrieved successfully',
               data: result.data,
               meta: {
                    page: result.pagination.page,
                    limit: result.pagination.limit,
                    total: result.pagination.total,
                    totalPage: result.pagination.pages,
               },
          });
     });

     searchStreams = catchAsync(async (req: Request, res: Response) => {
          const query = req.query.q as string;
          const page = parseInt(req.query.page as string) || 1;
          const limit = parseInt(req.query.limit as string) || 20;

          if (!query) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Search query is required');
          }

          const result = await StreamService.searchStreams(query, page, limit);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Streams search results retrieved successfully',
               data: result.data,
               meta: {
                    page: result.pagination.page,
                    limit: result.pagination.limit,
                    total: result.pagination.total,
                    totalPage: result.pagination.pages,
               },
          });
     });

     sendChatMessage = catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any)?._id || (req.user as any)?.id;
          const { streamId } = req.params;
          const { content, type } = req.body;

          if (!userId) {
               throw new AppError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
          }

          const message = await StreamService.sendChatMessage(
               streamId,
               userId,
               content,
               type || 'text',
          );

          sendResponse(res, {
               statusCode: StatusCodes.CREATED,
               success: true,
               message: 'Chat message sent successfully',
               data: message,
          });
     });
}

export default new StreamController();
