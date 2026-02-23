import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import WalletService from './wallet.service.js';

class WalletController {
  /**
   * Get wallet balance
   */
  getWalletBalance = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)._id;
    const result = await WalletService.getWalletBalance(userId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Wallet balance retrieved successfully',
      data: result,
    });
  });

  /**
   * Get transaction history
   */
  getTransactionHistory = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;

    const result = await WalletService.getTransactionHistory(
      userId,
      page,
      limit,
      type
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Transaction history retrieved successfully',
      data: result.data,
      meta: {
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        totalPage: result.pagination.pages,
      },
    });
  });

  /**
   * Get feather packages
   */
  getFeatherPackages = catchAsync(async (req: Request, res: Response) => {
    const result = await WalletService.getFeatherPackages();

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Feather packages retrieved successfully',
      data: result,
    });
  });

  /**
   * Create withdrawal request
   */
  createWithdrawal = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)._id;
    const { amount, bankDetails } = req.body;

    const result = await WalletService.createWithdrawal(
      userId,
      amount,
      bankDetails
    );

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: result.message,
      data: result,
    });
  });

  /**
   * ==================== ADMIN ONLY ====================
   */

  /**
   * Create feather package
   */
  createFeatherPackage = catchAsync(async (req: Request, res: Response) => {
    const result = await WalletService.createFeatherPackage(req.body);

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: 'Feather package created successfully',
      data: result,
    });
  });

  /**
   * Update feather package
   */
  updateFeatherPackage = catchAsync(async (req: Request, res: Response) => {
    const { packageId } = req.params;
    const result = await WalletService.updateFeatherPackage(packageId, req.body);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Feather package updated successfully',
      data: result,
    });
  });

  /**
   * Get all wallets
   */
  getAllWallets = catchAsync(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await WalletService.getAllWallets(page, limit);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'All wallets retrieved successfully',
      data: result.data,
      meta: {
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        totalPage: result.pagination.pages,
      },
    });
  });
}

export default new WalletController();
