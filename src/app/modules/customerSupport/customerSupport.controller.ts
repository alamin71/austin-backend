import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import { CustomerSupportService } from './customerSupport.service.js';

// User: Get or create conversation
const getOrCreateConversation = catchAsync(async (req: Request, res: Response) => {
     const userId = (req.user as any).id;
     const result = await CustomerSupportService.getOrCreateConversation(userId);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Conversation retrieved successfully',
          data: result,
     });
});

// User/Admin: Send message
const sendMessage = catchAsync(async (req: Request, res: Response) => {
     const { conversationId } = req.params;
     const { message } = req.body;
     const senderId = (req.user as any).id;
     const userRole = (req.user as any).role;

     const senderRole = ['ADMIN', 'SUPER_ADMIN'].includes(userRole) ? 'admin' : 'user';

     const result = await CustomerSupportService.sendMessage(
          conversationId,
          senderId,
          message,
          senderRole,
     );

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.CREATED,
          message: 'Message sent successfully',
          data: result,
     });
});

// User/Admin: Get messages
const getMessages = catchAsync(async (req: Request, res: Response) => {
     const { conversationId } = req.params;
     const userId = (req.user as any).id;
     const userRole = (req.user as any).role;

     const result = await CustomerSupportService.getMessages(conversationId, userId, userRole);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Messages retrieved successfully',
          data: result,
     });
});

// User/Admin: Mark as read
const markMessagesAsRead = catchAsync(async (req: Request, res: Response) => {
     const { conversationId } = req.params;
     const userRole = (req.user as any).role;

     const senderRole = ['ADMIN', 'SUPER_ADMIN'].includes(userRole) ? 'admin' : 'user';

     const result = await CustomerSupportService.markMessagesAsRead(conversationId, senderRole);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: result.message,
          data: {},
     });
});

// Admin: Get all conversations
const getAllConversations = catchAsync(async (req: Request, res: Response) => {
     const result = await CustomerSupportService.getAllConversations();

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'All conversations retrieved successfully',
          data: result,
     });
});

// Admin: Update status
const updateConversationStatus = catchAsync(async (req: Request, res: Response) => {
     const { conversationId } = req.params;
     const { status } = req.body;

     const result = await CustomerSupportService.updateConversationStatus(conversationId, status);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Conversation status updated successfully',
          data: result,
     });
});

export const CustomerSupportController = {
     getOrCreateConversation,
     sendMessage,
     getMessages,
     markMessagesAsRead,
     getAllConversations,
     updateConversationStatus,
};
