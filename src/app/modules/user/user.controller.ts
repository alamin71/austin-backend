import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import { UserService } from './user.service.js';
import config from '../../../config/index.js';
import bcrypt from 'bcrypt';
import { uploadFileToS3 } from '../../../helpers/s3Helper.js';
const createUser = catchAsync(async (req, res) => {
     const { ...userData } = req.body;
     const result = await UserService.createUserToDB(userData);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'User created successfully',
          data: result,
     });
});

const getUserProfile = catchAsync(async (req, res) => {
     const user: any = req.user;
     const result = await UserService.getUserProfileFromDB(user);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Profile data retrieved successfully',
          data: result,
     });
});

// Get user profile by ID (with permission check)
const getUserProfileById = catchAsync(async (req: Request, res: Response) => {
     const requesterId = (req.user as any).id;
     const { userId } = req.params;

     const result = await UserService.getUserProfileById(requesterId, userId);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'User profile retrieved successfully',
          data: result,
     });
});

//update profile
const updateProfile = catchAsync(async (req, res) => {
     const user: any = req.user;
     if ('role' in req.body) {
          delete req.body.role;
     }
     // If password is provided
     if (req.body.password) {
          req.body.password = await bcrypt.hash(req.body.password, Number(config.bcrypt_salt_rounds));
     }

     // Upload image to S3 if provided
     if (req.file) {
          const s3Url = await uploadFileToS3(req.file, 'user/images');
          req.body.image = s3Url;
     }

     const result = await UserService.updateProfileToDB(user, req.body);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Profile updated successfully',
          data: result,
     });
});
//delete profile
const deleteProfile = catchAsync(async (req, res) => {
     const { id }: any = req.user;
     const { password } = req.body;
     const isUserVerified = await UserService.verifyUserPassword(id, password);
     if (!isUserVerified) {
          return sendResponse(res, {
               success: false,
               statusCode: StatusCodes.UNAUTHORIZED,
               message: 'Incorrect password. Please try again.',
          });
     }

     const result = await UserService.deleteUser(id);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Profile deleted successfully',
          data: result,
     });
});

// Block user
const blockUser = catchAsync(async (req: Request, res: Response) => {
     const userId = (req.user as any).id;
     const { blockUserId } = req.params;

     const result = await UserService.blockUser(userId, blockUserId);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: result.message,
          data: {},
     });
});

// Unblock user
const unblockUser = catchAsync(async (req: Request, res: Response) => {
     const userId = (req.user as any).id;
     const { unblockUserId } = req.params;

     const result = await UserService.unblockUser(userId, unblockUserId);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: result.message,
          data: {},
     });
});

// Get blocked users
const getBlockedUsers = catchAsync(async (req: Request, res: Response) => {
     const userId = (req.user as any).id;

     const result = await UserService.getBlockedUsers(userId);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Blocked users retrieved successfully',
          data: result.blockedUsers,
     });
});

// Check if user is blocked
const isUserBlocked = catchAsync(async (req: Request, res: Response) => {
     const userId = (req.user as any).id;
     const { checkUserId } = req.params;

     const result = await UserService.isUserBlocked(userId, checkUserId);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Block status retrieved',
          data: result,
     });
});

// Update privacy settings
const updatePrivacySettings = catchAsync(async (req: Request, res: Response) => {
     const userId = (req.user as any).id;
     let settings = req.body;

     // Parse form-data boolean values
     if (settings.publicProfile) {
          settings.publicProfile = settings.publicProfile === 'true' || settings.publicProfile === true;
     }

     const result = await UserService.updatePrivacySettings(userId, settings);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: result.message,
          data: {},
     });
});

// Get privacy settings
const getPrivacySettings = catchAsync(async (req: Request, res: Response) => {
     const userId = (req.user as any).id;

     const result = await UserService.getPrivacySettings(userId);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Privacy settings retrieved',
          data: result,
     });
});

// Update security settings
const updateSecuritySettings = catchAsync(async (req: Request, res: Response) => {
     const userId = (req.user as any).id;
     let settings = req.body;

     // Parse form-data boolean values
     if (settings.twoFactorEnabled) {
          settings.twoFactorEnabled = settings.twoFactorEnabled === 'true' || settings.twoFactorEnabled === true;
     }

     const result = await UserService.updateSecuritySettings(userId, settings);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: result.message,
          data: {},
     });
});

// Get security settings
const getSecuritySettings = catchAsync(async (req: Request, res: Response) => {
     const userId = (req.user as any).id;

     const result = await UserService.getSecuritySettings(userId);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Security settings retrieved',
          data: result,
     });
});

// Get active sessions
const getActiveSessions = catchAsync(async (req: Request, res: Response) => {
     const userId = (req.user as any).id;

     const result = await UserService.getActiveSessions(userId);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Active sessions retrieved',
          data: result,
     });
});

// Remove session
const removeSession = catchAsync(async (req: Request, res: Response) => {
     const userId = (req.user as any).id;
     const { sessionId } = req.params;

     const result = await UserService.removeSession(userId, sessionId);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: result.message,
          data: {},
     });
});

const logoutAllDevices = catchAsync(async (req: Request, res: Response) => {
     const userId = (req.user as any).id;

     const result = await UserService.logoutAllDevices(userId);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: result.message,
          data: {},
     });
});

const disableAccount = catchAsync(async (req: Request, res: Response) => {
     const userId = (req.user as any).id;

     const result = await UserService.disableAccount(userId);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: result.message,
          data: {},
     });
});

const requestDeleteAccountOtp = catchAsync(async (req: Request, res: Response) => {
     const userId = (req.user as any).id;
     const { password } = req.body;

     const result = await UserService.requestDeleteAccountOtp(userId, password);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'OTP sent to your email. Please verify OTP to delete account.',
          data: {
               deleteAccountToken: result.deleteAccountToken,
               email: result.email,
          },
     });
});

const verifyDeleteAccountOtp = catchAsync(async (req: Request, res: Response) => {
     const userId = (req.user as any).id;
     const result = await UserService.verifyDeleteAccountOtp(userId, req.body);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: result.message,
          data: {},
     });
});

export const UserController = {
     createUser,
     getUserProfile,
     getUserProfileById,
     updateProfile,
     deleteProfile,
     blockUser,
     unblockUser,
     getBlockedUsers,
     isUserBlocked,
     updatePrivacySettings,
     getPrivacySettings,
     updateSecuritySettings,
     getSecuritySettings,
     getActiveSessions,
     removeSession,
     logoutAllDevices,
     disableAccount,
     requestDeleteAccountOtp,
     verifyDeleteAccountOtp,
};
