import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import { StatusCodes } from 'http-status-codes';
import GiftService from './gift.service.js';

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
     const userId = (req.user as any)?._id;

     const transaction = await GiftService.sendGift(streamId, userId, req.body);

     sendResponse(res, {
          statusCode: StatusCodes.CREATED,
          success: true,
          message: 'Gift sent successfully',
          data: transaction,
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
     const streamerId = (req.user as any)?._id;
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
     getStreamGifts,
     getStreamerGifts,
};

export default GiftController;
