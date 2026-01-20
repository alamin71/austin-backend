import { StatusCodes } from 'http-status-codes';
import { Poll, PollVote } from './poll.model.js';
import AppError from '../../../errors/AppError.js';
import { logger, errorLogger } from '../../../shared/logger.js';
import { Stream } from '../stream/stream.model.js';

class PollService {
     /**
      * Create a poll for a live stream
      */
     static async createPoll(
          streamId: string,
          streamerId: string,
          pollData: {
               question: string;
               options: string[];
               duration: number;
               allowMultipleVotes: boolean;
          },
     ) {
          try {
               // Check if stream is live and owned by streamer
               const stream = await Stream.findOne({
                    _id: streamId,
                    streamer: streamerId,
                    status: 'live',
               });

               if (!stream) {
                    throw new AppError(
                         StatusCodes.NOT_FOUND,
                         'Stream not found or not live',
                    );
               }

               if (!stream.enablePolls) {
                    throw new AppError(
                         StatusCodes.BAD_REQUEST,
                         'Polls are disabled for this stream',
                    );
               }

               // Check if there's an active poll
               const activePoll = await Poll.findOne({
                    stream: streamId,
                    isActive: true,
               });

               if (activePoll) {
                    throw new AppError(
                         StatusCodes.BAD_REQUEST,
                         'There is already an active poll for this stream',
                    );
               }

               // Create poll
               const poll = new Poll({
                    stream: streamId,
                    streamer: streamerId,
                    question: pollData.question,
                    options: pollData.options.map((option) => ({
                         option,
                         votes: 0,
                         voters: [],
                    })),
                    duration: pollData.duration,
                    allowMultipleVotes: pollData.allowMultipleVotes,
                    startTime: new Date(),
               });

               await poll.save();

               // Add poll to stream
               await Stream.findByIdAndUpdate(streamId, {
                    $push: {
                         polls: {
                              question: pollData.question,
                              options: pollData.options.map((option) => ({
                                   option,
                                   votes: 0,
                              })),
                              startTime: poll.startTime,
                              endTime: poll.endTime,
                         },
                    },
               });

               logger.info(`Poll created: ${poll._id} for stream ${streamId}`);

               // Schedule poll end
               setTimeout(async () => {
                    await this.endPoll(poll._id.toString());
               }, pollData.duration * 1000);

               return poll;
          } catch (error) {
               errorLogger.error('Create poll error', error);
               throw error;
          }
     }

     /**
      * Vote on a poll
      */
     static async votePoll(
          pollId: string,
          userId: string,
          optionIndex: number,
     ) {
          try {
               const poll = await Poll.findById(pollId);

               if (!poll) {
                    throw new AppError(
                         StatusCodes.NOT_FOUND,
                         'Poll not found',
                    );
               }

               if (!poll.isActive) {
                    throw new AppError(
                         StatusCodes.BAD_REQUEST,
                         'Poll has ended',
                    );
               }

               // Check if poll has expired
               if (new Date() > poll.endTime) {
                    poll.isActive = false;
                    await poll.save();
                    throw new AppError(
                         StatusCodes.BAD_REQUEST,
                         'Poll has expired',
                    );
               }

               // Validate option index
               if (optionIndex < 0 || optionIndex >= poll.options.length) {
                    throw new AppError(
                         StatusCodes.BAD_REQUEST,
                         'Invalid option index',
                    );
               }

               // Check if user has already voted
               const existingVote = await PollVote.findOne({
                    poll: pollId,
                    user: userId,
               });

               if (existingVote && !poll.allowMultipleVotes) {
                    throw new AppError(
                         StatusCodes.BAD_REQUEST,
                         'You have already voted on this poll',
                    );
               }

               // Create vote
               const vote = new PollVote({
                    poll: pollId,
                    user: userId,
                    optionIndex,
               });

               await vote.save();

               // Update poll
               poll.options[optionIndex].votes += 1;
               poll.options[optionIndex].voters.push(userId as any);
               poll.totalVotes += 1;

               await poll.save();

               logger.info(`Vote cast on poll ${pollId} by user ${userId}`);

               return poll;
          } catch (error) {
               errorLogger.error('Vote poll error', error);
               throw error;
          }
     }

     /**
      * Get poll results
      */
     static async getPollResults(pollId: string) {
          try {
               const poll = await Poll.findById(pollId)
                    .populate('streamer', 'name avatar')
                    .populate('stream', 'title');

               if (!poll) {
                    throw new AppError(
                         StatusCodes.NOT_FOUND,
                         'Poll not found',
                    );
               }

               return poll;
          } catch (error) {
               errorLogger.error('Get poll results error', error);
               throw error;
          }
     }

     /**
      * Get active poll for a stream
      */
     static async getActivePoll(streamId: string) {
          try {
               const poll = await Poll.findOne({
                    stream: streamId,
                    isActive: true,
               })
                    .populate('streamer', 'name avatar')
                    .sort({ startTime: -1 });

               return poll;
          } catch (error) {
               errorLogger.error('Get active poll error', error);
               throw error;
          }
     }

     /**
      * Get all polls for a stream
      */
     static async getStreamPolls(streamId: string) {
          try {
               const polls = await Poll.find({ stream: streamId })
                    .populate('streamer', 'name avatar')
                    .sort({ startTime: -1 });

               return polls;
          } catch (error) {
               errorLogger.error('Get stream polls error', error);
               throw error;
          }
     }

     /**
      * End a poll
      */
     static async endPoll(pollId: string) {
          try {
               const poll = await Poll.findById(pollId);

               if (!poll) {
                    return;
               }

               poll.isActive = false;
               await poll.save();

               logger.info(`Poll ended: ${pollId}`);

               return poll;
          } catch (error) {
               errorLogger.error('End poll error', error);
               throw error;
          }
     }

     /**
      * Delete a poll (streamer only)
      */
     static async deletePoll(pollId: string, streamerId: string) {
          try {
               const poll = await Poll.findOne({
                    _id: pollId,
                    streamer: streamerId,
               });

               if (!poll) {
                    throw new AppError(
                         StatusCodes.NOT_FOUND,
                         'Poll not found or unauthorized',
                    );
               }

               await Poll.findByIdAndDelete(pollId);
               await PollVote.deleteMany({ poll: pollId });

               logger.info(`Poll deleted: ${pollId}`);

               return poll;
          } catch (error) {
               errorLogger.error('Delete poll error', error);
               throw error;
          }
     }
}

export default PollService;
