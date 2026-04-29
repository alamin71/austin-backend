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
}

export default new DeviceTokenController();
