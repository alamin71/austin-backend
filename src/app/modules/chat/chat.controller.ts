import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import { ChatService } from './chat.service';
import sendResponse from '../../../shared/sendResponse';

const createChat = catchAsync(async (req, res) => {
     const participant = req.body.participant;
     const { id }: any = req.user;
     const participants = [id, participant];
     const result = await ChatService.createChatIntoDB(participants);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Chat created successfully',
          data: result,
     });
});

const markChatAsRead = catchAsync(async (req, res) => {
     const { id } = req.params;
     const user: any = req?.user;

     const result = await ChatService.markChatAsRead(user.id, id);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Chat marked as read',
          data: result,
     });
});
const getChats = catchAsync(async (req, res) => {
     const { id }: any = req.user;

     const result = await ChatService.getAllChatsFromDB(id, req.query);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Chats retrieved successfully',
          data: result,
     });
});

export const ChatController = {
     createChat,
     getChats,
     markChatAsRead,
};
