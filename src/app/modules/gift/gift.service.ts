import { StatusCodes } from 'http-status-codes';
import { Gift, GiftTransaction } from './gift.model.js';
import AppError from '../../../errors/AppError.js';
import { logger, errorLogger } from '../../../shared/logger.js';
import { Stream } from '../stream/stream.model.js';
import { StreamAnalytics } from '../stream/streamAnalytics.model.js';
import { IGift } from './gift.interface.js';
import WalletService from '../wallet/wallet.service.js';
import ChallengeService from '../challenge/challenge.service.js';

class GiftService {
     private static async getOrCreateFeatherTransferGift() {
          const GIFT_NAME = '__feather_amount_transfer__';

          let gift = await Gift.findOne({ name: GIFT_NAME });
          if (!gift) {
               gift = await Gift.create({
                    name: GIFT_NAME,
                    description: 'System gift for direct feather amount transfer',
                    image: 'https://dummyimage.com/512x512/f7c948/ffffff.png&text=Feather',
                    price: 1,
                    category: 'basic',
                    isActive: false,
                    order: 9999,
               });
          }

          return gift;
     }

     private static async getOrCreateCashTransferGift() {
          const GIFT_NAME = '__cash_amount_transfer__';

          let gift = await Gift.findOne({ name: GIFT_NAME });
          if (!gift) {
               gift = await Gift.create({
                    name: GIFT_NAME,
                    description: 'System gift for direct cash amount transfer',
                    image: 'https://dummyimage.com/512x512/1d4ed8/ffffff.png&text=Cash',
                    price: 1,
                    category: 'basic',
                    isActive: false,
                    order: 10000,
               });
          }

          return gift;
     }

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

               // ✅ NEW: Calculate feather cost instead of USD
               const featherCost = gift.price * giftData.quantity;
               const usdValue = (gift.price / 100) * giftData.quantity; // Convert to USD

               // ✅ NEW: Use wallet service to transfer feathers
               const walletResult = await WalletService.sendGift(
                    senderId,
                    stream.streamer._id.toString(),
                    streamId,
                    featherCost,
                    usdValue
               );

               // Create gift transaction
               const transaction = new GiftTransaction({
                    sender: senderId,
                    receiver: stream.streamer,
                    stream: streamId,
                    gift: gift._id,
                    quantity: giftData.quantity,
                    totalAmount: usdValue, // Store USD value
                    message: giftData.message,
                    isAnonymous: giftData.isAnonymous,
                    status: 'completed',
               });

               await transaction.save();

               // Update challenge progress (non-blocking)
               ChallengeService.updateProgress(
                    senderId,
                    'gift_giver',
                    giftData.quantity,
               ).catch((challengeError) => {
                    errorLogger.error('Challenge progress update failed (gift_giver)', challengeError);
               });

               // Update stream analytics
               if (stream.analytics) {
                    await StreamAnalytics.findByIdAndUpdate(stream.analytics, {
                         $inc: {
                              giftsReceived: giftData.quantity,
                              revenue: usdValue,
                         },
                    });
               }

               // Add to stream gifts array
               await Stream.findByIdAndUpdate(streamId, {
                    $push: {
                         gifts: gift._id,
                    },
               });

               logger.info(
                    `✓ Gift sent: ${gift.name} x${giftData.quantity} (${featherCost} feathers, $${usdValue}) to stream ${streamId}`,
               );

               return transaction.populate([
                    { path: 'sender', select: 'name image' },
                    { path: 'receiver', select: 'name image' },
                    { path: 'gift' },
               ]);
          } catch (error) {
               errorLogger.error('Send gift error', error);
               throw error;
          }
     }

     /**
      * Send direct feather amount to streamer
      */
     static async sendFeatherGift(
          streamId: string,
          senderId: string,
          payload: {
               featherAmount: number;
               isAnonymous?: boolean;
          },
     ) {
          try {
               const featherAmount = Number(payload.featherAmount || 0);
               if (!Number.isFinite(featherAmount) || featherAmount < 1) {
                    throw new AppError(StatusCodes.BAD_REQUEST, 'featherAmount must be at least 1');
               }

               const stream = await Stream.findById(streamId);
               if (!stream) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
               }

               if (stream.status !== 'live') {
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Stream is not currently live');
               }

               if (!stream.allowGifts) {
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Gifts are disabled for this stream');
               }

               const gift = await this.getOrCreateFeatherTransferGift();
               const usdValue = featherAmount / 100;

               const walletResult = await WalletService.sendGift(
                    senderId,
                    stream.streamer._id.toString(),
                    streamId,
                    featherAmount,
                    usdValue,
               );

               const transaction = new GiftTransaction({
                    sender: senderId,
                    receiver: stream.streamer,
                    stream: streamId,
                    gift: gift._id,
                    quantity: 1,
                    totalAmount: featherAmount,
                    isAnonymous: payload.isAnonymous ?? false,
                    status: 'completed',
                    metadata: {
                         unit: 'feather',
                         featherAmount,
                         usdValue,
                    },
               });

               await transaction.save();

               ChallengeService.updateProgress(senderId, 'gift_giver', 1).catch((challengeError) => {
                    errorLogger.error('Challenge progress update failed (send-feather)', challengeError);
               });

               if (stream.analytics) {
                    await StreamAnalytics.findByIdAndUpdate(stream.analytics, {
                         $inc: {
                              giftsReceived: 1,
                              revenue: usdValue,
                         },
                    });
               }

               await Stream.findByIdAndUpdate(streamId, {
                    $push: {
                         gifts: gift._id,
                    },
               });

               logger.info(
                    `✓ Feather amount gift sent: ${featherAmount} feathers ($${usdValue}) to stream ${streamId}`,
               );

               const populatedTxn = await transaction.populate([
                    { path: 'sender', select: 'name image' },
                    { path: 'receiver', select: 'name image' },
                    { path: 'gift' },
               ]);

               return {
                    transaction: populatedTxn,
                    giftedFeathers: featherAmount,
                    availableFeathers: walletResult.senderBalance,
               };
          } catch (error) {
               errorLogger.error('Send feather gift error', error);
               throw error;
          }
     }

     /**
      * Send direct cash amount to streamer
      */
     static async sendCashGift(
          streamId: string,
          senderId: string,
          payload: {
               dollarAmount: number;
               isAnonymous?: boolean;
          },
     ) {
          try {
               const dollarAmount = Number(payload.dollarAmount || 0);
               if (!Number.isFinite(dollarAmount) || dollarAmount <= 0) {
                    throw new AppError(StatusCodes.BAD_REQUEST, 'dollarAmount must be greater than 0');
               }

               const stream = await Stream.findById(streamId);
               if (!stream) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
               }

               if (stream.status !== 'live') {
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Stream is not currently live');
               }

               if (!stream.allowGifts) {
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Gifts are disabled for this stream');
               }

               const gift = await this.getOrCreateCashTransferGift();

               const walletResult = await WalletService.sendCashGift(
                    senderId,
                    stream.streamer._id.toString(),
                    dollarAmount,
               );

               const transaction = new GiftTransaction({
                    sender: senderId,
                    receiver: stream.streamer,
                    stream: streamId,
                    gift: gift._id,
                    quantity: 1,
                    totalAmount: dollarAmount,
                    isAnonymous: payload.isAnonymous ?? false,
                    status: 'completed',
                    metadata: {
                         unit: 'cash',
                         dollarAmount,
                    },
               });

               await transaction.save();

               ChallengeService.updateProgress(senderId, 'gift_giver', 1).catch((challengeError) => {
                    errorLogger.error('Challenge progress update failed (send-cash)', challengeError);
               });

               if (stream.analytics) {
                    await StreamAnalytics.findByIdAndUpdate(stream.analytics, {
                         $inc: {
                              giftsReceived: 1,
                              revenue: dollarAmount,
                         },
                    });
               }

               await Stream.findByIdAndUpdate(streamId, {
                    $push: {
                         gifts: gift._id,
                    },
               });

               logger.info(
                    `✓ Cash gift sent: $${dollarAmount} to stream ${streamId}`,
               );

               const populatedTxn = await transaction.populate([
                    { path: 'sender', select: 'name image' },
                    { path: 'receiver', select: 'name image' },
                    { path: 'gift' },
               ]);

               return {
                    transaction: populatedTxn,
                    giftedCash: dollarAmount,
                    availableCash: walletResult.senderBalance,
               };
          } catch (error) {
               errorLogger.error('Send cash gift error', error);
               throw error;
          }
     }

     /**
      * Get gift transactions for a stream
      */
     static async getStreamGifts(streamId: string) {
          try {
               const transactions = await GiftTransaction.find({ stream: streamId })
                    .populate('sender', 'name image')
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
                    .populate('sender', 'name image')
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
