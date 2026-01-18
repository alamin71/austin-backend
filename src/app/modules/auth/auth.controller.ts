import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AuthService } from './auth.service';
import config from '../../../config';

const registerUser = catchAsync(async (req, res) => {
     const raw = req.body.body || req.body;
     const payload = JSON.parse(JSON.stringify(raw));
     const normalized = {
          ...payload,
          name: (payload.name || '').trim(),
          userName: (payload.userName || '').trim().toLowerCase(),
          email: (payload.email || '').trim().toLowerCase(),
          bio: payload.bio || '',
          socialLinks: payload.socialLinks || { x: '', instagram: '', youtube: '' },
     };

     console.log('📁 File received:', req.file ? req.file.originalname : 'No file'); // ✅ Debug

     // ✅ req.file pass করো
     const result = await AuthService.registerUserToDB(normalized, req.file);
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.CREATED,
          message: 'User registered successfully. Please check your email to verify your account.',
          data: result,
     });
});
const verifyEmail = catchAsync(async (req, res) => {
     const result = await AuthService.verifyEmailToDB(req.body);
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: result.message,
          data: {},
     });
});

const verifyResetOtp = catchAsync(async (req, res) => {
     const result = await AuthService.verifyResetOtpToDB(req.body);
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: result.message,
          data: {
               type: result.type,
               email: result.email,
               resetToken: result.resetToken,
          },
     });
});

const loginUser = catchAsync(async (req, res) => {
     const result = await AuthService.loginUserFromDB(req.body);
     const cookieOptions: any = { secure: false, httpOnly: true, maxAge: 31536000000 };
     if (config.node_env === 'production') cookieOptions.sameSite = 'none';

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'User logged in successfully.',
          data: { accessToken: result.accessToken, refreshToken: result.refreshToken },
     });
});

const forgetPassword = catchAsync(async (req, res) => {
     const result = await AuthService.forgetPasswordToDB(req.body.email);
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: `Please check your email: ${result.email}. We have sent you a one-time passcode (OTP).`,
          data: { otp: result.otp },
     });
});

const forgetPasswordByUrl = catchAsync(async (req, res) => {
     await AuthService.forgetPasswordByUrlToDB(req.body.email);
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Please check your email. We have sent you a password reset link.',
          data: {},
     });
});

const resetPasswordByUrl = catchAsync(async (req, res) => {
     const token = req.headers?.authorization?.split(' ')[1];
     const result = await AuthService.resetPasswordByUrl(token!, req.body);
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Your password has been successfully reset.',
          data: result,
     });
});

const resetPassword = catchAsync(async (req, res) => {
     const token: any = req.headers.resettoken;
     const result = await AuthService.resetPasswordToDB(token!, req.body);
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Your password has been successfully reset.',
          data: result,
     });
});

const changePassword = catchAsync(async (req, res) => {
     const user: any = req.user;
     const result = await AuthService.changePasswordToDB(user, req.body);
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Your password has been successfully changed',
          data: result,
     });
});

const resendOtp = catchAsync(async (req, res) => {
     const result = await AuthService.resendOtpFromDb(req.body.email);
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'OTP sent successfully again',
          data: result,
     });
});

const refreshToken = catchAsync(async (req, res) => {
     const token = req.headers?.refreshtoken as string;
     const result = await AuthService.refreshToken(token);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Access token retrieved successfully',
          data: result,
     });
});

export const AuthController = {
     registerUser,
     verifyEmail,
     verifyResetOtp,
     loginUser,
     forgetPassword,
     resetPassword,
     changePassword,
     forgetPasswordByUrl,
     resetPasswordByUrl,
     resendOtp,
     refreshToken,
};
