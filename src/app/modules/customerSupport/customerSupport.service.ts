import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError.js';
import { CustomerSupport, SupportMessage } from './customerSupport.model.js';
import { User } from '../user/user.model.js';

// User: Get or create conversation
const getOrCreateConversation = async (userId: string) => {
     const user = await User.findById(userId);
     if (!user) {
          throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
     }

     // Find existing conversation
     let conversation = await CustomerSupport.findOne({ user: userId }).populate(
          'user',
          'name userName image email',
     );

     // Create new if doesn't exist
     if (!conversation) {
          conversation = await CustomerSupport.create({
               user: userId,
               status: 'open',
               lastMessage: '',
               unreadCountUser: 0,
               unreadCountAdmin: 0,
          });

          conversation = await CustomerSupport.findById(conversation._id).populate(
               'user',
               'name userName image email',
          );
     }

     return conversation;
};

// User/Admin: Send message
const sendMessage = async (
     conversationId: string,
     senderId: string,
     message: string,
     senderRole: 'user' | 'admin',
     type?: 'text' | 'image' | 'file',
     mediaUrl?: string,
) => {
     const conversation = await CustomerSupport.findById(conversationId);
     if (!conversation) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Conversation not found');
     }

     // Create message
     const newMessage = await SupportMessage.create({
          conversation: conversationId,
          sender: senderId,
          senderRole,
          message: message.trim(),
          type: type || 'text',
          mediaUrl: mediaUrl || null,
          isRead: false,
     });

     // Update conversation
     const updateData: any = {
          lastMessage: message.trim(),
          lastMessageAt: new Date(),
          status: conversation.status === 'closed' ? 'in-progress' : conversation.status,
     };

     // Increment unread count for receiver
     if (senderRole === 'user') {
          updateData.$inc = { unreadCountAdmin: 1 };
     } else {
          updateData.$inc = { unreadCountUser: 1 };
     }

     await CustomerSupport.findByIdAndUpdate(conversationId, updateData);

     const populatedMessage = await SupportMessage.findById(newMessage._id).populate(
          'sender',
          'name userName image',
     );

     return populatedMessage;
};

// User/Admin: Get messages
const getMessages = async (conversationId: string, userId: string, userRole: string) => {
     const conversation = await CustomerSupport.findById(conversationId);
     if (!conversation) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Conversation not found');
     }

     // Check permission
     const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);
     const isOwner = conversation.user.toString() === userId;

     if (!isAdmin && !isOwner) {
          throw new AppError(StatusCodes.FORBIDDEN, 'You cannot access this conversation');
     }

     const messages = await SupportMessage.find({ conversation: conversationId })
          .populate('sender', 'name userName image')
          .sort({ createdAt: 1 })
          .lean();

     return messages;
};

// User/Admin: Mark messages as read
const markMessagesAsRead = async (conversationId: string, userRole: 'user' | 'admin') => {
     const conversation = await CustomerSupport.findById(conversationId);
     if (!conversation) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Conversation not found');
     }

     // Mark unread messages as read
     await SupportMessage.updateMany(
          {
               conversation: conversationId,
               senderRole: userRole === 'user' ? 'admin' : 'user',
               isRead: false,
          },
          {
               isRead: true,
               readAt: new Date(),
          },
     );

     // Reset unread count
     const updateField = userRole === 'user' ? 'unreadCountUser' : 'unreadCountAdmin';
     await CustomerSupport.findByIdAndUpdate(conversationId, {
          [updateField]: 0,
     });

     return { message: 'Messages marked as read' };
};

// Admin: Get all conversations
const getAllConversations = async () => {
     const conversations = await CustomerSupport.find()
          .populate('user', 'name userName image email')
          .sort({ lastMessageAt: -1 })
          .lean();

     return conversations;
};

// Admin: Update conversation status
const updateConversationStatus = async (
     conversationId: string,
     status: 'open' | 'in-progress' | 'closed',
) => {
     const conversation = await CustomerSupport.findByIdAndUpdate(
          conversationId,
          { status },
          { new: true },
     ).populate('user', 'name userName image email');

     if (!conversation) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Conversation not found');
     }

     return conversation;
};

export const CustomerSupportService = {
     getOrCreateConversation,
     sendMessage,
     getMessages,
     markMessagesAsRead,
     getAllConversations,
     updateConversationStatus,
};
