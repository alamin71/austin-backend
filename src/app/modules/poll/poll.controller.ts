// Create general poll (no streamId)
const createGeneralPoll = catchAsync(async (req: Request, res: Response) => {
     const userId = (req.user as any)?._id || (req.user as any)?.id;

     const poll = await PollService.createGeneralPoll(userId, {
          ...req.body,
     });

     sendResponse(res, {
          statusCode: StatusCodes.CREATED,
          success: true,
          message: 'General poll created successfully',
          data: poll,
     });
});
import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import { StatusCodes } from 'http-status-codes';
import PollService from './poll.service.js';

// Create poll
const createPoll = catchAsync(async (req: Request, res: Response) => {
     const { streamId } = req.params;
     const streamerId = (req.user as any)?._id || (req.user as any)?.id;

     const poll = await PollService.createPoll(streamId, streamerId, {
          ...req.body,
     });

     sendResponse(res, {
          statusCode: StatusCodes.CREATED,
          success: true,
          message: 'Poll created successfully',
          data: poll,
     });
});

// Vote on poll
const votePoll = catchAsync(async (req: Request, res: Response) => {
     const { pollId } = req.params;
     const userId = (req.user as any)?._id || (req.user as any)?.id;

     const poll = await PollService.votePoll(
          pollId,
          userId,
          req.body.optionIndex,
     );

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Vote cast successfully',
          data: poll,
     });
});

// Get poll results
const getPollResults = catchAsync(async (req: Request, res: Response) => {
     const { pollId } = req.params;
     const poll = await PollService.getPollResults(pollId);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Poll results retrieved successfully',
          data: poll,
     });
});

// Get active poll for stream
const getActivePoll = catchAsync(async (req: Request, res: Response) => {
     const { streamId } = req.params;
     const poll = await PollService.getActivePoll(streamId);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Active poll retrieved successfully',
          data: poll,
     });
});

// Get all polls for stream
const getStreamPolls = catchAsync(async (req: Request, res: Response) => {
     const { streamId } = req.params;
     const polls = await PollService.getStreamPolls(streamId);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Stream polls retrieved successfully',
          data: polls,
     });
});

// End poll
const endPoll = catchAsync(async (req: Request, res: Response) => {
     const { pollId } = req.params;
     const streamerId = (req.user as any)?._id || (req.user as any)?.id;
     const poll = await PollService.endPoll(pollId, streamerId);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Poll ended successfully',
          data: poll,
     });
});

// Delete poll
const deletePoll = catchAsync(async (req: Request, res: Response) => {
     const { pollId } = req.params;
     const streamerId = (req.user as any)?._id || (req.user as any)?.id;

     await PollService.deletePoll(pollId, streamerId);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Poll deleted successfully',
          data: null,
     });
});

// Add option to active poll (streamer only)
const addOption = catchAsync(async (req: Request, res: Response) => {
     const { pollId } = req.params;
     const streamerId = (req.user as any)?._id || (req.user as any)?.id;

     const poll = await PollService.addOption(pollId, streamerId, req.body.option);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Poll option added successfully',
          data: poll,
     });
});

// Delete option from active poll (streamer only)
const deleteOption = catchAsync(async (req: Request, res: Response) => {
     const { pollId } = req.params;
     const streamerId = (req.user as any)?._id || (req.user as any)?.id;

     const poll = await PollService.deleteOption(
          pollId,
          streamerId,
          req.body.optionIndex,
     );

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Poll option deleted successfully',
          data: poll,
     });
});

const PollController = {
     createPoll,
     createGeneralPoll,
     votePoll,
     getPollResults,
     getActivePoll,
     getStreamPolls,
     endPoll,
     deletePoll,
     addOption,
     deleteOption,
};

export default PollController;
