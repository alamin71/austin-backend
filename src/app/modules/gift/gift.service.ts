import { StatusCodes } from 'http-status-codes';
import { Gift, GiftTransaction } from './gift.model.js';
import AppError from '../../../errors/AppError.js';
import { logger, errorLogger } from '../../../shared/logger.js';
import { Stream } from '../stream/stream.model.js';
import { StreamAnalytics } from '../stream/streamAnalytics.model.js';
import { IGift } from './gift.interface.js';

class GiftService {
     /**
      * Create a new gift (Admin only)
      */
     static async createGift(giftData: IGift) {
          try {
               const existingGift = await Gift.findOne({ name: giftData.name });
               if (existingGift) {
                    throw new AppError(
                         StatusCodes.CONFLICT,
                         'Gift with this name already exists',
                    );
               }

               const gift = new Gift(giftData);
               await gift.save();

               logger.info(`Gift created: ${gift._id}`);
               return gift;
          } catch (error) {
               errorLogger.error('Create gift error', error);
               throw error;
          }
     }

     /**
      * Get all active gifts
      */
     static async getAllGifts(includeInactive = false) {
          try {
               const query = includeInactive ? {} : { isActive: true };
               const gifts = await Gift.find(query).sort({ order: 1, price: 1 });
               return gifts;
          } catch (error) {
               errorLogger.error('Get all gifts error', error);
               throw error;
          }
     }

     /**
      * Get gifts by category
      */
     static async getGiftsByCategory(category: string) {
          try {
               const gifts = await Gift.find({
                    category,
                    isActive: true,
               }).sort({ order: 1, price: 1 });
               return gifts;
          } catch (error) {
               errorLogger.error('Get gifts by category error', error);
               throw error;
          }
     }

     /**
      * Get gift by ID
      */
     static async getGiftById(giftId: string) {
          try {
               const gift = await Gift.findById(giftId);
               if (!gift) {
                    throw new AppError(
                         StatusCodes.NOT_FOUND,
                         'Gift not found',
                    );
               }
               return gift;
          } catch (error) {
               errorLogger.error('Get gift by ID error', error);
               throw error;
          }
     }

     /**
      * Update gift (Admin only)
      */
     static async updateGift(giftId: string, updates: Partial<IGift>) {
          try {
               const gift = await Gift.findByIdAndUpdate(giftId, updates, {
                    new: true,
                    runValidators: true,
               });

               if (!gift) {
                    throw new AppError(
                         StatusCodes.NOT_FOUND,
                         'Gift not found',
                    );
               }

               logger.info(`Gift updated: ${giftId}`);
               return gift;
          } catch (error) {
               errorLogger.error('Update gift error', error);
               throw error;
          }
     }

     /**
      * Delete gift (Admin only)
      */
     static async deleteGift(giftId: string) {
          try {
               const gift = await Gift.findByIdAndDelete(giftId);
               if (!gift) {
                    throw new AppError(
                         StatusCodes.NOT_FOUND,
                         'Gift not found',
                    );
               }

               logger.info(`Gift deleted: ${giftId}`);
               return gift;
          } catch (error) {
               errorLogger.error('Delete gift error', error);
               throw error;
          }
     }

     /**
      * Send gift to streamer
      */
     static async sendGift(
          streamId: string,
          senderId: string,
          giftData: {
               giftId: string;
               quantity: number;
               message?: string;
               isAnonymous: boolean;
          },
     ) {
          try {
               // Check if stream is live
               const stream = await Stream.findById(streamId);
               if (!stream) {
                    throw new AppError(
                         StatusCodes.NOT_FOUND,
                         'Stream not found',
                    );
               }

               if (stream.status !== 'live') {
                    throw new AppError(
                         StatusCodes.BAD_REQUEST,
                         'Stream is not currently live',
                    );
               }

               if (!stream.allowGifts) {
                    throw new AppError(
                         StatusCodes.BAD_REQUEST,
                         'Gifts are disabled for this stream',
                    );
               }

               // Get gift details
               const gift = await this.getGiftById(giftData.giftId);

               // Calculate total amount
               const totalAmount = gift.price * giftData.quantity;

               // TODO: Process payment (Stripe integration)
               // For now, we'll assume payment is successful

               // Create gift transaction
               const transaction = new GiftTransaction({
                    sender: senderId,
                    receiver: stream.streamer,
                    stream: streamId,
                    gift: gift._id,
                    quantity: giftData.quantity,
                    totalAmount,
                    message: giftData.message,
                    isAnonymous: giftData.isAnonymous,
                    status: 'completed',
               });

               await transaction.save();

               // Update stream analytics
               if (stream.analytics) {
                    await StreamAnalytics.findByIdAndUpdate(stream.analytics, {
                         $inc: {
                              giftsReceived: giftData.quantity,
                              revenue: totalAmount / 100, // Convert cents to dollars
                         },
                    });
               }

               // Add to stream gifts array
               await Stream.findByIdAndUpdate(streamId, {
                    $push: {
                         gifts: {
                              user: senderId,
                              gift: gift._id,
                              quantity: giftData.quantity,
                              timestamp: new Date(),
                         },
                    },
               });

               logger.info(
                    `Gift sent: ${gift.name} x${giftData.quantity} to stream ${streamId}`,
               );

               return transaction.populate([
                    { path: 'sender', select: 'name avatar' },
                    { path: 'receiver', select: 'name avatar' },
                    { path: 'gift' },
               ]);
          } catch (error) {
               errorLogger.error('Send gift error', error);
               throw error;
          }
     }

     /**
      * Get gift transactions for a stream
      */
     static async getStreamGifts(streamId: string) {
          try {
               const transactions = await GiftTransaction.find({ stream: streamId })
                    .populate('sender', 'name avatar')
                    .populate('gift')
                    .sort({ createdAt: -1 });

               return transactions;
          } catch (error) {
               errorLogger.error('Get stream gifts error', error);
               throw error;
          }
     }

     /**
      * Get gift transactions received by streamer
      */
     static async getStreamerGifts(streamerId: string) {
          try {
               const transactions = await GiftTransaction.find({
                    receiver: streamerId,
               })
                    .populate('sender', 'name avatar')
                    .populate('stream', 'title')
                    .populate('gift')
                    .sort({ createdAt: -1 });

               return transactions;
          } catch (error) {
               errorLogger.error('Get streamer gifts error', error);
               throw error;
          }
     }
}

export default GiftService;
