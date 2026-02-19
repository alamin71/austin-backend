import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import StreamService from './stream.service.js';
import AppError from '../../../errors/AppError.js';
import { uploadFileToS3 } from '../../../helpers/s3Helper.js';

class StreamController {
     startStream = catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any)?._id || (req.user as any)?.id;
          const streamData = req.body;

          if (!userId) {
               throw new AppError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
          }

          // Upload banner to S3 if provided
          if (req.file) {
               const s3Url = await uploadFileToS3(req.file, 'stream/banner');
               streamData.banner = s3Url;
          } else {
               // Banner might be optional, but log if not provided
               console.log('Warning: No banner file provided for stream');
          }

          const stream = await StreamService.startStream(userId, streamData);

          sendResponse(res, {
               statusCode: StatusCodes.CREATED,
               success: true,
               message: 'Stream started successfully',
               data: stream,
          });
     });

     pauseStream = catchAsync(async (req: Request, res: Response) => {
          const { streamId } = req.params;

          const stream = await StreamService.pauseStream(streamId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Stream paused successfully',
               data: stream,
          });
     });

     resumeStream = catchAsync(async (req: Request, res: Response) => {
          const { streamId } = req.params;

          const stream = await StreamService.resumeStream(streamId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Stream resumed successfully',
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
     getAllRecordings = catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any)?._id || (req.user as any)?.id;
          const page = parseInt(req.query.page as string) || 1;
          const limit = parseInt(req.query.limit as string) || 20;

          if (!userId) {
               throw new AppError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
          }

          const result = await StreamService.getAllRecordings(userId, page, limit);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Recordings retrieved successfully',
               data: result.data,
               meta: result.meta,
          });
     });

     handleRecordingWebhook = catchAsync(async (req: Request, res: Response) => {
          const result = await StreamService.handleRecordingWebhook(req.body);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Recording webhook processed successfully',
               data: result,
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

     joinStream = catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any)?._id || (req.user as any)?.id;
          const { streamId } = req.params;

          if (!userId) {
               throw new AppError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
          }

          const result = await StreamService.joinStream(streamId, userId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Joined stream successfully',
               data: result,
          });
     });

     leaveStream = catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any)?._id || (req.user as any)?.id;
          const { streamId } = req.params;

          if (!userId) {
               throw new AppError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
          }

          await StreamService.leaveStream(streamId, userId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Left stream successfully',
               data: null,
          });
     });

     likeStream = catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any)?._id || (req.user as any)?.id;
          const { streamId } = req.params;

          if (!userId) {
               throw new AppError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
          }

          const stream = await StreamService.likeStream(streamId, userId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Stream liked successfully',
               data: stream,
          });
     });

     updateStreamSettings = catchAsync(async (req: Request, res: Response) => {
          const { streamId } = req.params;
          const settings = req.body;

          const stream = await StreamService.updateStreamSettings(streamId, settings);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Stream settings updated successfully',
               data: stream,
          });
     });

     toggleStreamControls = catchAsync(async (req: Request, res: Response) => {
          const { streamId } = req.params;
          const controls = req.body;

          const stream = await StreamService.toggleStreamControls(streamId, controls);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Stream controls updated successfully',
               data: stream,
          });
     });

     getStreamAnalytics = catchAsync(async (req: Request, res: Response) => {
          const { streamId } = req.params;

          const analytics = await StreamService.getStreamAnalytics(streamId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Stream analytics retrieved successfully',
               data: analytics,
          });
     });

     checkRecordingStatus = catchAsync(async (req: Request, res: Response) => {
          const { streamId } = req.params;

          const stream = await StreamService.getStreamDetails(streamId);
          if (!stream) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
          }

          if (!stream.recordingResourceId || !stream.recordingSid) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'No active recording for this stream');
          }

          const recordingStatus = await StreamService.checkRecordingStatus(
               stream.recordingResourceId,
               stream.recordingSid,
          );

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Recording status retrieved successfully',
               data: recordingStatus,
          });
     });
}

export default new StreamController();
