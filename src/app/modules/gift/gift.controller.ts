import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import { StatusCodes } from 'http-status-codes';
import GiftService from './gift.service.js';
import AppError from '../../../errors/AppError.js';

const getRequestUserId = (req: Request): string => {
     const userId = (req.user as any)?.id || (req.user as any)?._id;
     if (!userId) {
          throw new AppError(StatusCodes.UNAUTHORIZED, 'You are not authorized !!');
     }
     return userId;
};

// Create gift (Admin only)
const createGift = catchAsync(async (req: Request, res: Response) => {
     const gift = await GiftService.createGift(req.body);

     sendResponse(res, {
          statusCode: StatusCodes.CREATED,
          success: true,
          message: 'Gift created successfully',
          data: gift,
     });
});

// Get all gifts
const getAllGifts = catchAsync(async (req: Request, res: Response) => {
     const includeInactive = req.query.includeInactive === 'true';
     const gifts = await GiftService.getAllGifts(includeInactive);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Gifts retrieved successfully',
          data: gifts,
     });
});

// Get gifts by category
const getGiftsByCategory = catchAsync(async (req: Request, res: Response) => {
     const { category } = req.params;
     const gifts = await GiftService.getGiftsByCategory(category);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Gifts retrieved successfully',
          data: gifts,
     });
});

// Get gift by ID
const getGiftById = catchAsync(async (req: Request, res: Response) => {
     const { giftId } = req.params;
     const gift = await GiftService.getGiftById(giftId);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Gift retrieved successfully',
          data: gift,
     });
});

// Update gift (Admin only)
const updateGift = catchAsync(async (req: Request, res: Response) => {
     const { giftId } = req.params;
     const gift = await GiftService.updateGift(giftId, req.body);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Gift updated successfully',
          data: gift,
     });
});

// Delete gift (Admin only)
const deleteGift = catchAsync(async (req: Request, res: Response) => {
     const { giftId } = req.params;
     await GiftService.deleteGift(giftId);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Gift deleted successfully',
          data: null,
     });
});

// Send gift to streamer
const sendGift = catchAsync(async (req: Request, res: Response) => {
     const { streamId } = req.params;
     const userId = getRequestUserId(req);

     const transaction = await GiftService.sendGift(streamId, userId, req.body);

     sendResponse(res, {
          statusCode: StatusCodes.CREATED,
          success: true,
          message: 'Gift sent successfully',
          data: transaction,
     });
});

// Send custom feather amount to streamer
const sendFeatherGift = catchAsync(async (req: Request, res: Response) => {
     const { streamId } = req.params;
     const userId = getRequestUserId(req);

     const result = await GiftService.sendFeatherGift(streamId, userId, req.body);

     sendResponse(res, {
          statusCode: StatusCodes.CREATED,
          success: true,
          message: 'Feather gift sent successfully',
          data: result,
     });
});

// Send cash amount to streamer
const sendCashGift = catchAsync(async (req: Request, res: Response) => {
     const { streamId } = req.params;
     const userId = getRequestUserId(req);

     const result = await GiftService.sendCashGift(streamId, userId, req.body);

     sendResponse(res, {
          statusCode: StatusCodes.CREATED,
          success: true,
          message: 'Cash gift sent successfully',
          data: result,
     });
});

// Get amount of gifts received for a stream
const getStreamGiftSummary = catchAsync(async (req: Request, res: Response) => {
     const { streamId } = req.params;
     const summary = await GiftService.getStreamGiftSummary(streamId);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Stream gift summary retrieved successfully',
          data: summary,
     });
});

// Get stream gifts
const getStreamGifts = catchAsync(async (req: Request, res: Response) => {
     const { streamId } = req.params;
     const gifts = await GiftService.getStreamGifts(streamId);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Stream gifts retrieved successfully',
          data: gifts,
     });
});

// Get streamer gifts
const getStreamerGifts = catchAsync(async (req: Request, res: Response) => {
     const streamerId = getRequestUserId(req);
     const gifts = await GiftService.getStreamerGifts(streamerId);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Streamer gifts retrieved successfully',
          data: gifts,
     });
});

const GiftController = {
     createGift,
     getAllGifts,
     getGiftsByCategory,
     getGiftById,
     updateGift,
     deleteGift,
     sendGift,
     sendFeatherGift,
     sendCashGift,
     getStreamGiftSummary,
     getStreamGifts,
     getStreamerGifts,
};

export default GiftController;
