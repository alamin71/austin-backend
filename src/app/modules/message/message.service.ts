import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError.js';
import { User } from '../user/user.model.js';
import { Message } from './message.model.js';

export class MessageService {
     // Send message
     static async sendMessage(
          senderId: string,
          receiverId: string,
          content: string,
          type: string = 'text',
          mediaUrl?: string,
     ) {
          // Validate users exist
          const sender = await User.findById(senderId);
          const receiver = await User.findById(receiverId);

          if (!sender || !receiver) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
          }

          if (senderId === receiverId) {
               throw new AppError(
                    StatusCodes.BAD_REQUEST,
                    'Cannot send message to yourself',
               );
          }

          // Check if sender is blocked by receiver
          const isBlocked = receiver.blockedUsers?.some(
               (b: any) => b.toString() === senderId,
          );

          if (isBlocked) {
               throw new AppError(
                    StatusCodes.FORBIDDEN,
                    'You are blocked by this user. Cannot send message.',
               );
          }

          // Check if users are friends
          const areFriends = receiver.friends?.some(
               (f: any) => f.toString() === senderId,
          );

          if (!areFriends) {
               throw new AppError(
                    StatusCodes.FORBIDDEN,
                    'You must be friends to send messages',
               );
          }

          const message = await Message.create({
               sender: senderId,
               receiver: receiverId,
               content,
               type,
               mediaUrl,
               isRead: false,
          });

          return message.populate(['sender', 'receiver']);
     }

     // Get conversation between two users
     static async getConversation(userId: string, otherUserId: string, limit = 50) {
          const messages = await Message.find({
               $or: [
                    { sender: userId, receiver: otherUserId },
                    { sender: otherUserId, receiver: userId },
               ],
          })
               .populate(['sender', 'receiver'])
               .sort({ createdAt: -1 })
               .limit(limit);

          return messages.reverse();
     }

     // Get user conversations (list of users they've messaged)
     static async getConversationsList(userId: string) {
          // Get all unique conversations
          const messages = await Message.aggregate([
               {
                    $match: {
                         $or: [{ sender: userId }, { receiver: userId }],
                    },
               },
               {
                    $sort: { createdAt: -1 },
               },
               {
                    $group: {
                         _id: {
                              $cond: [
                                   { $eq: ['$sender', userId] },
                                   '$receiver',
                                   '$sender',
                              ],
                         },
                         lastMessage: { $first: '$$ROOT' },
                         unreadCount: {
                              $sum: {
                                   $cond: [
                                        {
                                             $and: [
                                                  { $eq: ['$receiver', userId] },
                                                  { $eq: ['$isRead', false] },
                                             ],
                                        },
                                        1,
                                        0,
                                   ],
                              },
                         },
                    },
               },
               {
                    $project: {
                         userId: '$_id',
                         lastMessage: 1,
                         unreadCount: 1,
                         _id: 0,
                    },
               },
          ]);

          // Populate sender and receiver info
          await Message.populate(messages, [
               { path: 'lastMessage.sender' },
               { path: 'lastMessage.receiver' },
          ]);

          return messages;
     }

     // Mark messages as read
     static async markAsRead(userId: string, otherUserId: string) {
          const result = await Message.updateMany(
               {
                    sender: otherUserId,
                    receiver: userId,
                    isRead: false,
               },
               {
                    isRead: true,
                    readAt: new Date(),
               },
          );

          return result;
     }

     // Get unread count
     static async getUnreadCount(userId: string) {
          const count = await Message.countDocuments({
               receiver: userId,
               isRead: false,
          });

          return { unreadCount: count };
     }

     // Delete message
     static async deleteMessage(messageId: string, userId: string) {
          const message = await Message.findById(messageId);

          if (!message) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Message not found');
          }

          if (message.sender.toString() !== userId) {
               throw new AppError(
                    StatusCodes.FORBIDDEN,
                    'You can only delete your own messages',
               );
          }

          await Message.findByIdAndDelete(messageId);

          return { message: 'Message deleted successfully' };
     }

     // Block user
     static async blockUser(userId: string, blockUserId: string) {
          if (userId === blockUserId) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Cannot block yourself');
          }

          const user = await User.findById(userId);
          if (!user) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
          }

          const blockUser = await User.findById(blockUserId);
          if (!blockUser) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User to block not found');
          }

          // Check if already blocked
          const isAlreadyBlocked = user.blockedUsers?.some(
               (b: any) => b.toString() === blockUserId,
          );

          if (isAlreadyBlocked) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'User already blocked');
          }

          // Add to blockedUsers
          await User.findByIdAndUpdate(userId, {
               $addToSet: { blockedUsers: blockUserId },
          });

          // Remove from friends if they were friends
          await User.findByIdAndUpdate(userId, {
               $pull: { friends: blockUserId },
          });

          // Also remove from blocker's friends array in the blocked user's record
          await User.findByIdAndUpdate(blockUserId, {
               $pull: { friends: userId },
          });

          return { message: 'User blocked successfully' };
     }

     // Unblock user
     static async unblockUser(userId: string, unblockUserId: string) {
          if (userId === unblockUserId) {
               throw new AppError(
                    StatusCodes.BAD_REQUEST,
                    'Cannot unblock yourself',
               );
          }

          const user = await User.findById(userId);
          if (!user) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
          }

          const unblockUser = await User.findById(unblockUserId);
          if (!unblockUser) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User to unblock not found');
          }

          // Remove from blockedUsers
          await User.findByIdAndUpdate(userId, {
               $pull: { blockedUsers: unblockUserId },
          });

          return { message: 'User unblocked successfully' };
     }

     // Get blocked users list
     static async getBlockedUsers(userId: string) {
          const user = await User.findById(userId).populate(
               'blockedUsers',
               'name userName image email bio',
          );

          if (!user) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
          }

          return { blockedUsers: user.blockedUsers || [] };
     }

     // Check if user is blocked
     static async isUserBlocked(userId: string, checkUserId: string) {
          const user = await User.findById(userId);

          if (!user) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
          }

          const isBlocked = user.blockedUsers?.some(
               (b: any) => b.toString() === checkUserId,
          );

          return { isBlocked: !!isBlocked };
     }
}
