import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { CommentsService } from './comments.service';

// create comments
const createComment = catchAsync(async (req, res) => {
     const { userId, postId, content } = req.body;
     const result = await CommentsService.createCommentToDB(userId, postId, content);
     sendResponse(res, {
          statusCode: StatusCodes.CREATED,
          success: true,
          message: 'Comment Created successfully',
          data: result,
     });
});
// get comments
const getComments = catchAsync(async (req, res) => {
     const { postId } = req.params;
     const result = await CommentsService.getComments(postId, req.query);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Comments retrieved successfully',
          data: result.comments,
          meta: result.meta,
     });
});
// like comments
const likeComment = catchAsync(async (req, res) => {
     const { commentId } = req.params;
     const result = await CommentsService.likeComment(commentId);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Liked comments successfully',
          data: result,
     });
});

// reply comments
const replyToComment = catchAsync(async (req, res) => {
     const { commentId } = req.params;
     const { userId, content } = req.body;
     const result = await CommentsService.replyToComment(commentId, userId, content);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Reply created successfully',
          data: result,
     });
});

export const CommentsController = {
     createComment,
     getComments,
     replyToComment,
     likeComment,
};
