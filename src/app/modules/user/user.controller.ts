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

     // Transform response: avatar → image
     const plainResult = result && (result as any).toObject ? (result as any).toObject() : result;
     const responseData = plainResult ? {
          ...plainResult,
          image: plainResult.avatar,
     } : plainResult;
     
     // Remove avatar field from response
     if (responseData && 'avatar' in responseData) {
          delete responseData.avatar;
     }

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Profile data retrieved successfully',
          data: responseData,
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
          req.body.avatar = s3Url;
     }

     const result = await UserService.updateProfileToDB(user, req.body);

     // Transform response: avatar → image
     const plainResult = result && (result as any).toObject ? (result as any).toObject() : result;
     const responseData = plainResult ? {
          ...plainResult,
          image: plainResult.avatar,
     } : plainResult;
     
     // Remove avatar field from response
     if (responseData && 'avatar' in responseData) {
          delete responseData.avatar;
     }

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Profile updated successfully',
          data: responseData,
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

export const UserController = {
     createUser,
     getUserProfile,
     updateProfile,
     deleteProfile,
};
