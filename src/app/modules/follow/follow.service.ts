import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError.js';
import { User } from '../user/user.model.js';
import { NotificationService } from '../notification/notification.service.js';

export class FollowService {
     // Follow a user/streamer
     static async followUser(followerId: string, followingId: string) {
          const follower = await User.findById(followerId);
          const following = await User.findById(followingId);

          if (!follower || !following) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
          }

          if (followerId === followingId) {
               throw new AppError(
                    StatusCodes.BAD_REQUEST,
                    'Cannot follow yourself',
               );
          }

          // Check if already following
          const isFollowing = following.followers?.includes(follower._id);
          if (isFollowing) {
               throw new AppError(
                    StatusCodes.BAD_REQUEST,
                    'Already following this user',
               );
          }

          // Add follower to following user's followers list
          await User.findByIdAndUpdate(
               followingId,
               { $addToSet: { followers: followerId } },
               { new: true },
          );

          // Add to follower's following list
          await User.findByIdAndUpdate(
               followerId,
               { $addToSet: { following: followingId } },
               { new: true },
          );

          // Create notification for the followed user
          await NotificationService.createNotification(
               followingId,
               'new_follower',
               `${follower.name} started following you`,
               followerId,
               undefined,
               `/profile/${follower.userName}`,
               'user-plus',
          );

          return { message: 'Successfully followed' };
     }

     // Unfollow a user/streamer
     static async unfollowUser(followerId: string, followingId: string) {
          const follower = await User.findById(followerId);
          const following = await User.findById(followingId);

          if (!follower || !following) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
          }

          if (followerId === followingId) {
               throw new AppError(
                    StatusCodes.BAD_REQUEST,
                    'Cannot unfollow yourself',
               );
          }

          // Remove from following user's followers list
          await User.findByIdAndUpdate(
               followingId,
               { $pull: { followers: followerId } },
               { new: true },
          );

          // Remove from follower's following list
          await User.findByIdAndUpdate(
               followerId,
               { $pull: { following: followingId } },
               { new: true },
          );

          return { message: 'Successfully unfollowed' };
     }

     // Get followers list
     static async getFollowers(userId: string) {
          const user = await User.findById(userId).populate(
               'followers',
               'name userName image bio',
          );

          if (!user) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
          }

          return user.followers || [];
     }

     // Get following list
     static async getFollowing(userId: string) {
          const user = await User.findById(userId).populate(
               'following',
               'name userName image bio',
          );

          if (!user) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
          }

          return user.following || [];
     }

     // Check if following
     static async isFollowing(
          followerId: string,
          followingId: string,
     ): Promise<boolean> {
          const following = await User.findById(followingId);

          if (!following) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
          }

          return (
               following.followers?.some(
                    (f: any) => f.toString() === followerId,
               ) || false
          );
     }
}
