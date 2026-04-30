import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import AppError from '../../../errors/AppError.js';
import DeviceTokenService from './deviceToken.service.js';

class DeviceTokenController {
     /**
      * Register device token for push notifications
      */
     registerDeviceToken = catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any)?._id || (req.user as any)?.id;

          if (!userId) {
               throw new AppError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
          }

          const { deviceToken, deviceType, deviceName } = req.body;

          if (!deviceToken || !deviceType) {
               throw new AppError(
                    StatusCodes.BAD_REQUEST,
                    'Device token and type are required',
               );
          }

          const result = await DeviceTokenService.registerDeviceToken(
               userId,
               deviceToken,
               deviceType,
               deviceName,
          );

          sendResponse(res, {
               statusCode: StatusCodes.CREATED,
               success: true,
               message: 'Device token registered successfully',
               data: result,
          });
     });

     /**
      * Deactivate device token
      */
     deactivateDeviceToken = catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any)?._id || (req.user as any)?.id;

          if (!userId) {
               throw new AppError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
          }

          const { deviceToken } = req.body;

          if (!deviceToken) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Device token is required');
          }

          const result = await DeviceTokenService.deactivateDeviceToken(deviceToken);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Device token deactivated successfully',
               data: result,
          });
     });

     /**
      * Get user's device tokens
      */
     getUserDeviceTokens = catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any)?._id || (req.user as any)?.id;

          if (!userId) {
               throw new AppError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
          }

          const tokens = await DeviceTokenService.getUserDeviceTokens(userId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Device tokens retrieved successfully',
               data: tokens,
          });
     });

     /**
      * Delete device token
      */
     deleteDeviceToken = catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any)?._id || (req.user as any)?.id;

          if (!userId) {
               throw new AppError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
          }

          const { deviceToken } = req.body;

          if (!deviceToken) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Device token is required');
          }

          const result = await DeviceTokenService.deleteDeviceToken(
               deviceToken,
               userId,
          );

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Device token deleted successfully',
               data: result,
          });
     });

     /**
      * TEST ENDPOINT: Send test FCM push notification
      * POST /notification/device/test-push
      */
     testSendPush = catchAsync(async (req: Request, res: Response) => {
          const userId = (req.user as any)?._id || (req.user as any)?.id;

          if (!userId) {
               throw new AppError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
          }

          const { title = 'Test Notification', body = 'This is a test FCM notification' } = req.body;

          const result = await DeviceTokenService.sendNotificationToUser(
               userId,
               title,
               body,
               {
                    type: 'test',
                    message: 'FCM Test Push',
               },
          );

          // Ensure error is serializable for clients
          const responseData: any = { ...result };
          if (!result.success && result.error) {
               const err: any = result.error;
               responseData.errorMessage = err?.message || JSON.stringify(err);
          }

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: result.success,
               message: result.success
                    ? `Test push sent to ${result.sentTo} device(s)`
                    : 'Test push failed',
               data: responseData,
          });
     });
}

export default new DeviceTokenController();
