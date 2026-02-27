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

          // Check for existing request
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

          // Create new request
          const friendRequest = await FriendRequest.create({
               sender: senderId,
               receiver: receiverId,
               status: 'pending',
          });

          // Create notification for receiver
          const senderUser = await User.findById(senderId).select('name userName');
          await NotificationService.createNotification(
               receiverId,
               'friend_request_received',
               `${senderUser?.name || senderUser?.userName} sent you a friend request`,
               senderId,
               friendRequest._id.toString(),
               `/friend-request/${friendRequest._id}`,
               senderUser?.image,
          );

          return friendRequest.populate(['sender', 'receiver']);
     }

     // Get pending friend requests
     static async getPendingRequests(userId: string) {
          const requests = await FriendRequest.find({
               receiver: userId,
               status: 'pending',
          })
               .populate('sender', 'name userName image')
               .sort({ requestedAt: -1 });

          return requests;
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

          return request;
     }

     // Get friends list
     static async getFriendsList(userId: string) {
          const user = await User.findById(userId).populate(
               'friends',
               'name userName image bio',
          );

          if (!user) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
          }

          return user.friends || [];
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

          return { message: 'Friend removed successfully' };
     }
}
