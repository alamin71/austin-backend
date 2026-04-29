import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError.js';
import { DeviceToken } from './deviceToken.model.js';
import FirebaseHelper from '../../../helpers/firebaseHelper.js';
import { errorLogger, logger } from '../../../shared/logger.js';

class DeviceTokenService {
     /**
      * Register or update device token
      */
     static async registerDeviceToken(
          userId: string,
          deviceToken: string,
          deviceType: 'android' | 'ios' | 'web',
          deviceName?: string,
     ) {
          try {
               // Check if token already exists
               const existingToken = await DeviceToken.findOne({
                    deviceToken,
               });

               if (existingToken) {
                    // Update existing token
                    existingToken.user = userId as any;
                    existingToken.deviceType = deviceType;
                    existingToken.deviceName = deviceName;
                    existingToken.isActive = true;
                    await existingToken.save();
                    return existingToken;
               }

               // Create new token
               const newToken = await DeviceToken.create({
                    user: userId,
                    deviceToken,
                    deviceType,
                    deviceName,
                    isActive: true,
               });

               logger.info(
                    `Device token registered for user ${userId}: ${deviceType}`,
               );
               return newToken;
          } catch (error) {
               errorLogger.error('Register device token error:', error);
               throw new AppError(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    'Failed to register device token',
               );
          }
     }

     /**
      * Deactivate device token
      */
     static async deactivateDeviceToken(deviceToken: string) {
          try {
               const result = await DeviceToken.findOneAndUpdate(
                    { deviceToken },
                    { isActive: false },
                    { new: true },
               );

               if (!result) {
                    throw new AppError(
                         StatusCodes.NOT_FOUND,
                         'Device token not found',
                    );
               }

               logger.info(`Device token deactivated: ${deviceToken}`);
               return result;
          } catch (error) {
               errorLogger.error('Deactivate device token error:', error);
               throw error;
          }
     }

     /**
      * Get user's active device tokens
      */
     static async getUserDeviceTokens(userId: string) {
          try {
               const tokens = await DeviceToken.find({
                    user: userId,
                    isActive: true,
               }).select('deviceToken deviceType deviceName');

               return tokens;
          } catch (error) {
               errorLogger.error('Get user device tokens error:', error);
               throw new AppError(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    'Failed to fetch device tokens',
               );
          }
     }

     /**
      * Send notification to user's all devices
      */
     static async sendNotificationToUser(
          userId: string,
          title: string,
          body: string,
          data?: Record<string, string>,
          imageUrl?: string,
     ) {
          try {
               const tokens = await this.getUserDeviceTokens(userId);

               if (tokens.length === 0) {
                    logger.info(`No active device tokens for user ${userId}`);
                    return { success: true, sentTo: 0 };
               }

               const deviceTokens = tokens.map((token) => token.deviceToken);

               const result = await FirebaseHelper.sendToMultipleDevices(
                    deviceTokens,
                    title,
                    body,
                    data,
                    imageUrl,
               );

               // Remove failed tokens
               if (result.responses) {
                    for (let i = 0; i < result.responses.length; i++) {
                         if (!result.responses[i].success) {
                              await DeviceToken.findOneAndUpdate(
                                   { deviceToken: deviceTokens[i] },
                                   { isActive: false },
                              );
                         }
                    }
               }

               return { success: true, sentTo: result.successCount };
          } catch (error) {
               errorLogger.error('Send notification to user error:', error);
               return { success: false, error };
          }
     }

     /**
      * Send bulk notification to multiple users
      */
     static async sendBulkNotification(
          userIds: string[],
          title: string,
          body: string,
          data?: Record<string, string>,
          imageUrl?: string,
     ) {
          try {
               const allTokens: string[] = [];

               for (const userId of userIds) {
                    const tokens = await this.getUserDeviceTokens(userId);
                    allTokens.push(
                         ...tokens.map((token) => token.deviceToken),
                    );
               }

               if (allTokens.length === 0) {
                    logger.info('No device tokens found for bulk notification');
                    return { success: true, sentTo: 0 };
               }

               const result = await FirebaseHelper.sendToMultipleDevices(
                    allTokens,
                    title,
                    body,
                    data,
                    imageUrl,
               );

               return { success: true, sentTo: result.successCount };
          } catch (error) {
               errorLogger.error('Send bulk notification error:', error);
               return { success: false, error };
          }
     }

     /**
      * Delete device token
      */
     static async deleteDeviceToken(deviceToken: string, userId: string) {
          try {
               const result = await DeviceToken.findOneAndDelete({
                    deviceToken,
                    user: userId,
               });

               if (!result) {
                    throw new AppError(
                         StatusCodes.NOT_FOUND,
                         'Device token not found',
                    );
               }

               logger.info(`Device token deleted for user ${userId}`);
               return result;
          } catch (error) {
               errorLogger.error('Delete device token error:', error);
               throw error;
          }
     }

     /**
      * Get all device tokens for user by device type
      */
     static async getUserDevicesByType(
          userId: string,
          deviceType: 'android' | 'ios' | 'web',
     ) {
          try {
               const tokens = await DeviceToken.find({
                    user: userId,
                    deviceType,
                    isActive: true,
               });

               return tokens;
          } catch (error) {
               errorLogger.error('Get user devices by type error:', error);
               throw new AppError(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    'Failed to fetch devices',
               );
          }
     }
}

export default DeviceTokenService;
