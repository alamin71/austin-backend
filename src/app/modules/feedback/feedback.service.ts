import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError.js';
import { Feedback } from './feedback.model.js';
import { IFeedback } from './feedback.interface.js';
import { User } from '../user/user.model.js';

const createFeedback = async (userId: string, payload: { rating: number; message: string }) => {
     const { rating, message } = payload;

     if (!rating || rating < 1 || rating > 5) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Rating must be between 1 and 5');
     }

     if (!message || message.trim().length === 0) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Feedback message is required');
     }

     const user = await User.findById(userId);
     if (!user) {
          throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
     }

     const feedback = await Feedback.create({
          user: userId,
          rating,
          message: message.trim(),
     });

     const populatedFeedback = await Feedback.findById(feedback._id).populate(
          'user',
          'name userName email image',
     );

     return populatedFeedback;
};

const getAllFeedbacks = async () => {
     const feedbacks = await Feedback.find()
          .populate('user', 'name userName email image')
          .sort({ createdAt: -1 })
          .lean();

     return feedbacks;
};

const getFeedbackById = async (feedbackId: string) => {
     const feedback = await Feedback.findById(feedbackId)
          .populate('user', 'name userName email image bio')
          .lean();

     if (!feedback) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Feedback not found');
     }

     return feedback;
};

const getUserFeedbacks = async (userId: string) => {
     const feedbacks = await Feedback.find({ user: userId })
          .sort({ createdAt: -1 })
          .lean();

     return feedbacks;
};

const deleteFeedback = async (feedbackId: string, userId: string, userRole: string) => {
     const feedback = await Feedback.findById(feedbackId);

     if (!feedback) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Feedback not found');
     }

     // Only admin or the user who created it can delete
     const isAdmin = ['admin', 'super_admin'].includes(userRole);
     const isOwner = feedback.user.toString() === userId;

     if (!isAdmin && !isOwner) {
          throw new AppError(StatusCodes.FORBIDDEN, 'You cannot delete this feedback');
     }

     await Feedback.findByIdAndDelete(feedbackId);

     return { message: 'Feedback deleted successfully' };
};

export const FeedbackService = {
     createFeedback,
     getAllFeedbacks,
     getFeedbackById,
     getUserFeedbacks,
     deleteFeedback,
};
