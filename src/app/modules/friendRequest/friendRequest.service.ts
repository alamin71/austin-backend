import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import AppError from '../../../errors/AppError.js';
import { User } from '../user/user.model.js';
import { FriendRequest } from './friendRequest.model.js';
import { NotificationService } from '../notification/notification.service.js';

export class FriendRequestService {
     // Send friend request
     static async sendFriendRequest(
          senderId: string,
          receiverId: string,
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
                    'Cannot send friend request to yourself',
               );
          }

          // Check if already friends
          const isFriend = receiver.friends?.includes(
               new Types.ObjectId(senderId),
          );
          if (isFriend) {
               throw new AppError(
                    StatusCodes.BAD_REQUEST,
                    'Already friends with this user',
               );
          }

          // Check for existing pending request
          const existingRequest = await FriendRequest.findOne({
               $or: [
                    { sender: senderId, receiver: receiverId },
                    { sender: receiverId, receiver: senderId },
               ],
               status: 'pending',
          });

          if (existingRequest) {
               throw new AppError(
                    StatusCodes.BAD_REQUEST,
                    'Friend request already exists',
               );
          }

          // Delete any previous requests (rejected/accepted) so user can send again
          await FriendRequest.deleteOne({
               sender: senderId,
               receiver: receiverId,
               status: { $in: ['rejected', 'accepted'] },
          });

          // Create new request
          const friendRequest = await FriendRequest.create({
               sender: senderId,
               receiver: receiverId,
               status: 'pending',
          });

          // Create notification for receiver
          const senderUser = await User.findById(senderId).select('name userName image');
          await NotificationService.createNotification(
               receiverId,
               'friend_request_received',
               `${senderUser?.name || senderUser?.userName} sent you a friend request`,
               senderId,
               friendRequest._id.toString(),
               `/friend/${friendRequest._id}`,
               senderUser?.image,
          );

          return friendRequest.populate(['sender', 'receiver']);
     }

     // Accept friend request
     static async acceptFriendRequest(requestId: string, userId: string) {
          const request = await FriendRequest.findById(requestId);

          if (!request) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Request not found');
          }

          if (request.receiver.toString() !== userId) {
               throw new AppError(
                    StatusCodes.FORBIDDEN,
                    'You cannot accept this request',
               );
          }

          if (request.status !== 'pending') {
               throw new AppError(
                    StatusCodes.BAD_REQUEST,
                    'Request already processed',
               );
          }

          // Update request status
          request.status = 'accepted';
          request.respondedAt = new Date();
          await request.save();

          // Add to friends for both users
          await User.findByIdAndUpdate(
               request.sender,
               { $addToSet: { friends: request.receiver } },
               { new: true },
          );

          await User.findByIdAndUpdate(
               request.receiver,
               { $addToSet: { friends: request.sender } },
               { new: true },
          );

          // Create notification for sender that request was accepted
          const receiverUser = await User.findById(request.receiver).select(
               'name userName image',
          );
          await NotificationService.createNotification(
               request.sender.toString(),
               'friend_request_accepted',
               `${receiverUser?.name || receiverUser?.userName} accepted your friend request`,
               request.receiver.toString(),
               request._id.toString(),
               `/profile/${receiverUser?.userName}`,
               receiverUser?.image,
          );

          return request.populate(['sender', 'receiver']);
     }

     // Reject friend request
     static async rejectFriendRequest(requestId: string, userId: string) {
          const request = await FriendRequest.findById(requestId);

          if (!request) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Request not found');
          }

          if (request.receiver.toString() !== userId) {
               throw new AppError(
                    StatusCodes.FORBIDDEN,
                    'You cannot reject this request',
               );
          }

          if (request.status !== 'pending') {
               throw new AppError(
                    StatusCodes.BAD_REQUEST,
                    'Request already processed',
               );
          }

          request.status = 'rejected';
          request.respondedAt = new Date();
          await request.save();

          // Create notification for sender that request was rejected (optional)
          const receiverUser = await User.findById(request.receiver).select(
               'name userName image',
          );
          await NotificationService.createNotification(
               request.sender.toString(),
               'friend_request_rejected',
               `${receiverUser?.name || receiverUser?.userName} rejected your friend request`,
               request.receiver.toString(),
               request._id.toString(),
          );

          return request.populate(['sender', 'receiver']);
     }

     // Get friends list with pending requests
     static async getFriendsList(currentUserId: string, targetUserId: string) {
          const user = await User.findById(targetUserId).populate(
               'friends',
               'name userName image bio',
          );

          if (!user) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
          }

          // Get pending friend requests
          const pendingRequests = await FriendRequest.find({
               receiver: targetUserId,
               status: 'pending',
          })
               .populate('sender', 'name userName image')
               .sort({ requestedAt: -1 });

          const latestRequest = await FriendRequest.findOne({
               $or: [
                    { sender: currentUserId, receiver: targetUserId },
                    { sender: targetUserId, receiver: currentUserId },
               ],
          }).sort({ updatedAt: -1, createdAt: -1 });

          const isFriend = (user.friends || []).some(
               (friend: any) => friend._id?.toString() === currentUserId,
          );

          const relationStatus = isFriend
               ? 'accepted'
               : latestRequest?.status || null;

          return {
               relationStatus,
               friends: (user.friends || []).map((friend: any) => ({
                    ...friend.toObject(),
                    status: 'accepted',
               })),
               pendingRequests:
                    pendingRequests?.map((request) => ({
                         ...request.toObject(),
                         status: request.status,
                    })) || [],
          };
     }

     // Remove friend
     static async removeFriend(userId: string, friendId: string) {
          const user = await User.findById(userId);
          const friend = await User.findById(friendId);

          if (!user || !friend) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
          }

          // Remove from both users' friend lists
          await User.findByIdAndUpdate(
               userId,
               { $pull: { friends: friendId } },
               { new: true },
          );

          await User.findByIdAndUpdate(
               friendId,
               { $pull: { friends: userId } },
               { new: true },
          );

          // Delete the friend request record to allow sending request again
          await FriendRequest.deleteOne({
               $or: [
                    { sender: userId, receiver: friendId },
                    { sender: friendId, receiver: userId },
               ],
          });

          return { message: 'Friend removed successfully' };
     }
}
