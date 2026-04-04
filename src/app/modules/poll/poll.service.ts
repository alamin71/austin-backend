


import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import { Poll, PollVote } from './poll.model.js';
import AppError from '../../../errors/AppError.js';
import { logger, errorLogger } from '../../../shared/logger.js';
import { Stream } from '../stream/stream.model.js';

const POLL_DURATION_SECONDS = 24 * 60 * 60;

const formatTimeLeftText = (timeLeftSeconds: number) => {
     if (timeLeftSeconds <= 0) return 'Ended';

     const hours = Math.floor(timeLeftSeconds / 3600);
     const minutes = Math.floor((timeLeftSeconds % 3600) / 60);

     if (hours > 0) return `${hours}h ${minutes}m left`;
     return `${minutes}m left`;
};

const formatTimeAgo = (value?: Date | string) => {
     if (!value) return '';

     const createdTime = new Date(value).getTime();
     if (Number.isNaN(createdTime)) return '';

     const diffInSeconds = Math.max(0, Math.floor((Date.now() - createdTime) / 1000));
     if (diffInSeconds < 60) return `${diffInSeconds || 1} sec ago`;

     const diffInMinutes = Math.floor(diffInSeconds / 60);
     if (diffInMinutes < 60) return `${diffInMinutes} min ago`;

     const diffInHours = Math.floor(diffInMinutes / 60);
     if (diffInHours < 24) return `${diffInHours}h ago`;

     const diffInDays = Math.floor(diffInHours / 24);
     return `${diffInDays}d ago`;
};


class PollService {

          /**
           * Get all polls created by a user (with or without streamId)
           */
          static async getMyPolls(userId: string) {
               try {
                    const polls = await Poll.find({ streamer: userId }).sort({ createdAt: -1 });
                    return polls.map((poll) => this.buildPollResponse(poll));
               } catch (error) {
                    errorLogger.error('Get my polls error', error);
                    throw error;
               }
          }
     /**
      * Create a general poll (no streamId)
      */
     static async createGeneralPoll(
          userId: string,
          pollData: {
               question: string;
               description?: string;
               options: string[];
               duration?: number;
               allowMultipleVotes?: boolean;
          },
     ) {
          try {
               const normalizedOptions = this.normalizeOptions(pollData.options);
               // Ensure duration is valid (min 30, max 86400)
               let duration = Number(pollData.duration) || POLL_DURATION_SECONDS;
               if (duration < 30) duration = 30;
               if (duration > 86400) duration = 86400;
               const poll = new Poll({
                    streamer: userId,
                    question: pollData.question?.trim(),
                    description: pollData.description?.trim() || undefined,
                    options: normalizedOptions.map((option) => ({
                         option,
                         votes: 0,
                         voters: [],
                    })),
                    duration,
                    allowMultipleVotes: Boolean(pollData.allowMultipleVotes),
                    startTime: new Date(),
               });
               await poll.save();
               logger.info(`General poll created: ${poll._id}`);
               setTimeout(async () => {
                    await this.endPoll(poll._id.toString());
               }, duration * 1000);
               return this.buildPollResponse(poll);
          } catch (error) {
               errorLogger.error('Create general poll error', error);
               throw error;
          }
     }
     private static validatePollIdOrThrow(pollId: string) {
          if (!mongoose.Types.ObjectId.isValid(pollId)) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid pollId');
          }
     }

     private static buildPollResponse(poll: any, myVotes: number[] = []) {
          const rawPoll = typeof poll?.toObject === 'function' ? poll.toObject() : poll;
          const now = Date.now();
          const endTime = new Date(rawPoll.endTime).getTime();
          const timeLeftSeconds = Math.max(0, Math.floor((endTime - now) / 1000));
          const computedIsActive = rawPoll.isActive && timeLeftSeconds > 0;
          const totalVotes = rawPoll.totalVotes || 0;

          const options = (rawPoll.options || []).map((option: any, index: number) => {
               const votes = option.votes || 0;
               const percentage = totalVotes > 0 ? Number(((votes / totalVotes) * 100).toFixed(1)) : 0;

               return {
                    ...option,
                    percentage,
                    progress: percentage,
                    isVotedByMe: myVotes.includes(index),
               };
          });

          const streamer = rawPoll.streamer && typeof rawPoll.streamer === 'object'
               ? {
                    ...rawPoll.streamer,
                    displayName: rawPoll.streamer.name || rawPoll.streamer.userName || '',
                    photo: rawPoll.streamer.image || null,
               }
               : rawPoll.streamer;

          return {
               ...rawPoll,
               streamer,
               isActive: computedIsActive,
               duration: POLL_DURATION_SECONDS,
               totalVotes,
               options,
               myVotes,
               timeLeftSeconds,
               timeLeftHours: Number((timeLeftSeconds / 3600).toFixed(2)),
               leftHours: Math.ceil(timeLeftSeconds / 3600),
               timeLeftText: formatTimeLeftText(timeLeftSeconds),
               timeAgo: formatTimeAgo(rawPoll.createdAt),
          };
     }

     private static async ensurePollActiveOrThrow(poll: any) {
          if (!poll) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Poll not found');
          }

          if (new Date() > poll.endTime) {
               poll.isActive = false;
               await poll.save();
               throw new AppError(StatusCodes.BAD_REQUEST, 'Poll has expired');
          }

          if (!poll.isActive) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Poll has ended');
          }
     }

     private static normalizeOptions(options: string[]) {
          const normalized = (options || [])
               .map((option) => option?.trim())
               .filter((option) => !!option)
               .slice(0, 10);

          if (normalized.length < 2) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Poll must have at least 2 options');
          }

          return normalized;
     }

     /**
      * Create a poll for a live stream
      */
     static async createPoll(
          streamId: string,
          streamerId: string,
          pollData: {
               question: string;
               description?: string;
               options: string[];
               duration?: number;
               allowMultipleVotes?: boolean;
          },
     ) {
          try {
               // Validate stream existence and ownership first, then stream state.
               const stream = await Stream.findById(streamId).select(
                    'streamer status enablePolls',
               );

               if (!stream) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
               }

               if (stream.streamer.toString() !== streamerId.toString()) {
                    throw new AppError(
                         StatusCodes.FORBIDDEN,
                         'You are not the owner of this stream',
                    );
               }

               if (stream.status === 'ended') {
                    throw new AppError(
                         StatusCodes.BAD_REQUEST,
                         'Cannot create poll for an ended stream',
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
               const normalizedOptions = this.normalizeOptions(pollData.options);

               const poll = new Poll({
                    stream: streamId,
                    streamer: streamerId,
                    question: pollData.question?.trim(),
                    description: pollData.description?.trim() || undefined,
                    options: normalizedOptions.map((option) => ({
                         option,
                         votes: 0,
                         voters: [],
                    })),
                    duration: POLL_DURATION_SECONDS,
                    allowMultipleVotes: Boolean(pollData.allowMultipleVotes),
                    startTime: new Date(),
               });

               await poll.save();

               // Add poll to stream
               await Stream.findByIdAndUpdate(streamId, {
                    $push: {
                         polls: poll._id,
                    },
               });

               logger.info(`Poll created: ${poll._id} for stream ${streamId}`);

               // Schedule poll end
               setTimeout(async () => {
                    await this.endPoll(poll._id.toString());
               }, POLL_DURATION_SECONDS * 1000);

               return this.buildPollResponse(poll);
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
               this.validatePollIdOrThrow(pollId);

               const poll = await Poll.findById(pollId);

               await this.ensurePollActiveOrThrow(poll);
               const activePoll = poll!;

               // Validate option index
               if (optionIndex < 0 || optionIndex >= activePoll.options.length) {
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

               if (existingVote && !activePoll.allowMultipleVotes) {
                    throw new AppError(
                         StatusCodes.BAD_REQUEST,
                         'You have already voted on this poll',
                    );
               }

               if (existingVote && activePoll.allowMultipleVotes && existingVote.optionIndex === optionIndex) {
                    throw new AppError(
                         StatusCodes.BAD_REQUEST,
                         'You already voted for this option',
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
               activePoll.options[optionIndex].votes += 1;
               activePoll.options[optionIndex].voters.push(userId as any);
               activePoll.totalVotes += 1;

               await activePoll.save();

               logger.info(`Vote cast on poll ${pollId} by user ${userId}`);

               const myVotes = await PollVote.find({ poll: pollId, user: userId })
                    .select('optionIndex')
                    .lean();

               return this.buildPollResponse(
                    activePoll,
                    myVotes.map((voteItem) => voteItem.optionIndex),
               );
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
               this.validatePollIdOrThrow(pollId);

               const poll = await Poll.findById(pollId)
                    .populate('streamer', 'name userName image verified')
                    .populate('stream', 'title');

               if (!poll) {
                    throw new AppError(
                         StatusCodes.NOT_FOUND,
                         'Poll not found',
                    );
               }

               if (poll.isActive && new Date() > poll.endTime) {
                    poll.isActive = false;
                    await poll.save();
               }

               return this.buildPollResponse(poll);
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
                    .populate('streamer', 'name userName image verified')
                    .sort({ startTime: -1 });

               if (!poll) return null;

               if (new Date() > poll.endTime) {
                    poll.isActive = false;
                    await poll.save();
                    return null;
               }

               return this.buildPollResponse(poll);
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
                    .populate('streamer', 'name userName image verified')
                    .sort({ startTime: -1 });

               const now = new Date();

               for (const poll of polls) {
                    if (poll.isActive && now > poll.endTime) {
                         poll.isActive = false;
                         await poll.save();
                    }
               }

               return polls.map((poll) => this.buildPollResponse(poll));
          } catch (error) {
               errorLogger.error('Get stream polls error', error);
               throw error;
          }
     }

     /**
      * End a poll
      */
     static async endPoll(pollId: string, streamerId?: string) {
          try {
               this.validatePollIdOrThrow(pollId);

               const poll = await Poll.findById(pollId);

               if (!poll) {
                    return;
               }

               if (streamerId && poll.streamer.toString() !== streamerId.toString()) {
                    throw new AppError(StatusCodes.FORBIDDEN, 'Only streamer can end this poll');
               }

               poll.isActive = false;
               await poll.save();

               logger.info(`Poll ended: ${pollId}`);

               return this.buildPollResponse(poll);
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
               this.validatePollIdOrThrow(pollId);

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

     /**
      * Add option to an active poll (streamer only)
      */
     static async addOption(pollId: string, streamerId: string, option: string) {
          try {
               this.validatePollIdOrThrow(pollId);

               const poll = await Poll.findOne({ _id: pollId, streamer: streamerId });
               await this.ensurePollActiveOrThrow(poll);
               const activePoll = poll!;

               if (activePoll.options.length >= 10) {
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Maximum 10 options allowed');
               }

               activePoll.options.push({ option: option.trim(), votes: 0, voters: [] } as any);
               await activePoll.save();

               return this.buildPollResponse(activePoll);
          } catch (error) {
               errorLogger.error('Add poll option error', error);
               throw error;
          }
     }

     /**
      * Delete option from an active poll (streamer only)
      */
     static async deleteOption(pollId: string, streamerId: string, optionIndex: number) {
          try {
               this.validatePollIdOrThrow(pollId);

               const poll = await Poll.findOne({ _id: pollId, streamer: streamerId });
               await this.ensurePollActiveOrThrow(poll);
               const activePoll = poll!;

               if (optionIndex < 0 || optionIndex >= activePoll.options.length) {
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid option index');
               }

               if (activePoll.options.length <= 2) {
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Poll must have at least 2 options');
               }

               activePoll.options.splice(optionIndex, 1);
               await PollVote.deleteMany({ poll: pollId, optionIndex });
               await PollVote.updateMany(
                    { poll: pollId, optionIndex: { $gt: optionIndex } },
                    { $inc: { optionIndex: -1 } },
               );

               const allVotes = await PollVote.find({ poll: pollId }).lean();
               activePoll.totalVotes = allVotes.length;

               for (const option of activePoll.options) {
                    option.votes = 0;
                    option.voters = [] as any;
               }

               allVotes.forEach((vote) => {
                    if (activePoll.options[vote.optionIndex]) {
                         activePoll.options[vote.optionIndex].votes += 1;
                         activePoll.options[vote.optionIndex].voters.push(vote.user as any);
                    }
               });

               await activePoll.save();

               return this.buildPollResponse(activePoll);
          } catch (error) {
               errorLogger.error('Delete poll option error', error);
               throw error;
          }
     }
}

export default PollService;
