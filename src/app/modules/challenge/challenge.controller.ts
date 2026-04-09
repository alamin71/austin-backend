import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import { StatusCodes } from 'http-status-codes';
import ChallengeService from './challenge.service.js';


class ChallengeController {

    /**
     * Get top popular creators by followers
     */
    getPopularCreators = catchAsync(async (req: Request, res: Response) => {
      const creators = await ChallengeService.getPopularCreators(5);
      sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'Popular creators fetched successfully',
        data: creators,
      });
    });
  /**
   * Admin: Get challenges list for dashboard table.
   */
  getAdminChallenges = catchAsync(async (req: Request, res: Response) => {
    const result = await ChallengeService.getAdminChallenges(req.query as Record<string, string>);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Admin challenges retrieved successfully',
      data: result,
    });
  });

  /**
   * Admin: Get challenge detail.
   */
  getAdminChallengeById = catchAsync(async (req: Request, res: Response) => {
    const { challengeId } = req.params;
    const result = await ChallengeService.getAdminChallengeById(challengeId);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Admin challenge detail retrieved successfully',
      data: result,
    });
  });

  /**
   * Get all active challenges
   */
  getChallenges = catchAsync(async (req: Request, res: Response) => {
    const result = await ChallengeService.getChallenges();

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Challenges retrieved successfully',
      data: result,
    });
  });

  /**
   * Get user's challenge progress
   */
  getUserProgress = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const result = await ChallengeService.getUserProgress(userId);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Challenge progress retrieved successfully',
      data: result,
    });
  });

  /**
   * Get global rankings
   */
  getRankings = catchAsync(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;
    const result = await ChallengeService.getRankings(Number(limit));

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Rankings retrieved successfully',
      data: result,
    });
  });

  /**
   * Admin: Create a challenge
   */
  createChallenge = catchAsync(async (req: Request, res: Response) => {
    const result = await ChallengeService.createChallenge(req.body);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.CREATED,
      message: 'Challenge created successfully',
      data: result,
    });
  });

  /**
   * Admin: Update a challenge
   */
  updateChallenge = catchAsync(async (req: Request, res: Response) => {
    const { challengeId } = req.params;
    const result = await ChallengeService.updateChallenge(challengeId, req.body);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Challenge updated successfully',
      data: result,
    });
  });

  /**
   * Admin: Delete a challenge
   */
  deleteChallenge = catchAsync(async (req: Request, res: Response) => {
    const { challengeId } = req.params;
    const result = await ChallengeService.deleteChallenge(challengeId);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Challenge deleted successfully',
      data: result,
    });
  });
}

export default new ChallengeController();
