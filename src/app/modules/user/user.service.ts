import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user.js';
import { emailHelper } from '../../../helpers/emailHelper.js';
import { emailTemplate } from '../../../shared/emailTemplate.js';
import { IUser } from './user.interface.js';
import { User } from './user.model.js';
import AppError from '../../../errors/AppError.js';
import generateOTP from '../../../utils/generateOTP.js';
// create user
const createUserToDB = async (payload: IUser): Promise<IUser> => {
     //set role
     const user = await User.isExistUserByEmail(payload.email);
     if (user) {
          throw new AppError(StatusCodes.CONFLICT, 'Email already exists');
     }
     payload.role = USER_ROLES.USER;
     const createUser = await User.create(payload);
     if (!createUser) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to create user');
     }

     //send email
     const otp = generateOTP(4);
     const values = {
          name: createUser.name,
          otp: otp,
          email: createUser.email!,
     };
     const createAccountTemplate = emailTemplate.createAccount(values);
     emailHelper.sendEmail(createAccountTemplate);

     //save to DB
     const authentication = {
          oneTimeCode: otp,
          expireAt: new Date(Date.now() + 3 * 60000),
     };
     await User.findOneAndUpdate({ _id: createUser._id }, { $set: { authentication } });

     return createUser;
};


// get user profile
const getUserProfileFromDB = async (user: any) => {
     const userId = user?.id || user?._id;
     const userProfile = await User.findById(userId).select('-password -authentication -avatar');

     if (!userProfile) {
          throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
     }

     return userProfile;
};

// get other user's profile (with block check)
const getUserProfileById = async (requesterId: string, targetUserId: string) => {
     const targetUser = await User.findById(targetUserId).select('-password -authentication -avatar');

     if (!targetUser) {
          throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
     }

     // Check if requester is blocked by target user
     const isBlocked = targetUser.blockedUsers?.some(
          (b: any) => b.userId?.toString() === requesterId,
     );

     if (isBlocked) {
          throw new AppError(StatusCodes.FORBIDDEN, 'You cannot view this profile');
     }

     // Check privacy settings
     if (!targetUser.privacySettings?.publicProfile && requesterId !== targetUserId) {
          // Check if they are friends
          const areFriends = targetUser.friends?.some(
               (f: any) => f.toString() === requesterId,
          );

          if (!areFriends) {
               throw new AppError(StatusCodes.FORBIDDEN, 'This profile is private');
          }
     }

     return targetUser;
};
// update user profile
const updateProfileToDB = async (user: JwtPayload, payload: Partial<IUser>): Promise<Partial<IUser | null>> => {
     const { id } = user;
     const isExistUser = await User.isExistUserById(id);
     if (!isExistUser) {
          throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
     }

     // S3 handles file storage now, no local unlink needed
     // Old avatar can be deleted from S3 if needed via deleteFileFromS3

     const updateDoc = await User.findOneAndUpdate({ _id: id }, payload, {
          new: true,
     }).select('-password -authentication -avatar');

     return updateDoc;
};

const verifyUserPassword = async (userId: string, password: string) => {
     const user = await User.findById(userId).select('+password');
     if (!user) {
          throw new AppError(StatusCodes.NOT_FOUND, 'User not found.');
     }
     if (!user.password) return false;
     const isPasswordValid = await User.isMatchPassword(password, user.password);
     return isPasswordValid;
};
const deleteUser = async (id: string) => {
     const isExistUser = await User.isExistUserById(id);
     if (!isExistUser) {
          throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
     }

     await User.findByIdAndUpdate(id, {
          $set: { isDeleted: true },
     });

     return true;
};

// Block user (doesn't remove friend - just blocks interaction)
const blockUser = async (userId: string, blockUserId: string) => {
     if (userId === blockUserId) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Cannot block yourself');
     }

     const user = await User.findById(userId);
     const userToBlock = await User.findById(blockUserId);

     if (!user || !userToBlock) {
          throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
     }

     // Check if already blocked
     const isAlreadyBlocked = user.blockedUsers?.some(
          (b: any) => b.userId?.toString() === blockUserId,
     );

     if (isAlreadyBlocked) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'User already blocked');
     }

     // Add to blockedUsers with timestamp (friend relationship remains)
     await User.findByIdAndUpdate(userId, {
          $addToSet: { 
               blockedUsers: { 
                    userId: blockUserId,
                    blockedAt: new Date(),
               } 
          },
     });

     return { message: 'User blocked successfully' };
};

// Unblock user
const unblockUser = async (userId: string, unblockUserId: string) => {
     if (userId === unblockUserId) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Cannot unblock yourself');
     }

     const user = await User.findById(userId);

     if (!user) {
          throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
     }

     // Remove from blockedUsers
     await User.findByIdAndUpdate(userId, {
          $pull: { blockedUsers: { userId: unblockUserId } },
     });

     return { message: 'User unblocked successfully' };
};

// Get blocked users list
const getBlockedUsers = async (userId: string) => {
     const user = await User.findById(userId).populate(
          'blockedUsers.userId',
          'name userName image email bio',
     );

     if (!user) {
          throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
     }

     return { blockedUsers: user.blockedUsers || [] };
};

// Check if user is blocked
const isUserBlocked = async (userId: string, checkUserId: string) => {
     const user = await User.findById(userId);

     if (!user) {
          throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
     }

     const isBlocked = user.blockedUsers?.some(
          (b: any) => b.userId?.toString() === checkUserId,
     );

     return { isBlocked: !!isBlocked };
};

// Update privacy settings
const updatePrivacySettings = async (userId: string, settings: Partial<any>) => {
     const user = await User.findById(userId);

     if (!user) {
          throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
     }

     await User.findByIdAndUpdate(userId, {
          $set: { privacySettings: settings },
     });

     return { message: 'Privacy settings updated successfully' };
};

// Get privacy settings
const getPrivacySettings = async (userId: string) => {
     const user = await User.findById(userId).select('privacySettings');

     if (!user) {
          throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
     }

     return user.privacySettings;
};

// Update security settings
const updateSecuritySettings = async (userId: string, settings: any) => {
     const user = await User.findById(userId);

     if (!user) {
          throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
     }

     await User.findByIdAndUpdate(userId, {
          $set: { securitySettings: settings },
     });

     return { message: 'Security settings updated successfully' };
};

// Get security settings
const getSecuritySettings = async (userId: string) => {
     const user = await User.findById(userId).select('securitySettings');

     if (!user) {
          throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
     }

     return user.securitySettings;
};

export const UserService = {
     createUserToDB,
     getUserProfileFromDB,
     getUserProfileById,
     updateProfileToDB,
     deleteUser,
     verifyUserPassword,
     blockUser,
     unblockUser,
     getBlockedUsers,
     isUserBlocked,
     updatePrivacySettings,
     getPrivacySettings,
     updateSecuritySettings,
     getSecuritySettings,
};
