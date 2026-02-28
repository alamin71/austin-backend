import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import { AdminService } from './admin.service.js';

const createAdmin = catchAsync(async (req: Request, res: Response) => {
     const payload = req.body;
     const result = await AdminService.createAdminToDB(payload);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Admin created Successfully',
          data: result,
     });
});

const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
     const payload = req.params.id;
     const result = await AdminService.deleteAdminFromDB(payload);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Admin Deleted Successfully',
          data: result,
     });
});

const getAdmin = catchAsync(async (req: Request, res: Response) => {
     const result = await AdminService.getAdminFromDB();
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Admin Retrieved Successfully',
          data: result,
     });
});

const getAdminProfile = catchAsync(async (req: Request, res: Response) => {
     const adminId = (req.user as any)?._id || (req.user as any)?.id;
     
     if (!adminId) {
          throw new Error('Admin not authenticated');
     }

     const result = await AdminService.getAdminProfileById(adminId);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Admin Profile Retrieved Successfully',
          data: result,
     });
});

const updateAdminProfile = catchAsync(async (req: Request, res: Response) => {
     const adminId = (req.user as any)?._id || (req.user as any)?.id;
     
     if (!adminId) {
          throw new Error('Admin not authenticated');
     }

     const updateData = req.body;
     const imageFile = (req.files as any)?.image?.[0];

     const result = await AdminService.updateAdminProfile(adminId, updateData, imageFile);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Admin Profile Updated Successfully',
          data: result,
     });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
     const adminId = (req.user as any)?._id || (req.user as any)?.id;
     
     if (!adminId) {
          throw new Error('Admin not authenticated');
     }

     const result = await AdminService.changePasswordToDB(adminId, req.body);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Your password has been successfully changed',
          data: result,
     });
});

const adminLogin = catchAsync(async (req: Request, res: Response) => {
     const result = await AdminService.adminLoginToDB(req.body);
     const cookieOptions: any = { secure: false, httpOnly: true, maxAge: 31536000000 };
     
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Admin login successfully.',
          data: { accessToken: result.accessToken, refreshToken: result.refreshToken, role: result.role, email: result.email, userName: result.userName },
     });
});

const adminForgetPassword = catchAsync(async (req: Request, res: Response) => {
     const email = req.body.email || req.body.body?.email;
     const result = await AdminService.adminForgetPasswordToDB(email);
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: `OTP sent successfully to ${email}`,
          data: result,
     });
});

const adminVerifyResetOtp = catchAsync(async (req: Request, res: Response) => {
     const { email, oneTimeCode } = req.body;
     const result = await AdminService.adminVerifyResetOtpToDB({ email, oneTimeCode });
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: result.message,
          data: result,
     });
});

const adminResetPassword = catchAsync(async (req: Request, res: Response) => {
     const token = (req.headers.resettoken as string) || req.headers.authorization?.split(' ')[1] || '';
     const result = await AdminService.adminResetPasswordToDB(token, req.body);
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Password reset successfully',
          data: result,
     });
});

const adminResendOtp = catchAsync(async (req: Request, res: Response) => {
     const email = req.body.email || req.body.body?.email;
     const result = await AdminService.adminResendOtpToDB(email);
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: result.message,
          data: result,
     });
});

const getActiveStreams = catchAsync(async (req: Request, res: Response) => {
     const result = await AdminService.getActiveStreams();

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Active streams retrieved',
          data: result,
     });
});

const getStreamMonitoring = catchAsync(async (req: Request, res: Response) => {
     const result = await AdminService.getStreamMonitoring();

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Stream monitoring data retrieved',
          data: result,
     });
});

const warnStreamer = catchAsync(async (req: Request, res: Response) => {
     const adminId = (req.user as any).id;
     const { streamId, reason, severity, description } = req.body;

     const result = await AdminService.warnStreamer(
          adminId,
          streamId,
          reason,
          severity,
          description,
     );

     sendResponse(res, {
          statusCode: StatusCodes.CREATED,
          success: true,
          message: 'Warning issued to streamer',
          data: result,
     });
});

const endStream = catchAsync(async (req: Request, res: Response) => {
     const adminId = (req.user as any).id;
     const { streamId } = req.params;
     const { reason } = req.body;

     const result = await AdminService.endStream(adminId, streamId, reason);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Stream ended by admin',
          data: result,
     });
});

const getStreamerWarnings = catchAsync(async (req: Request, res: Response) => {
     const { streamerId } = req.params;

     const result = await AdminService.getStreamerWarnings(streamerId);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Streamer warnings retrieved',
          data: result,
     });
});

const resolveWarning = catchAsync(async (req: Request, res: Response) => {
     const adminId = (req.user as any).id;
     const { warningId } = req.params;
     const { actionTaken } = req.body;

     const result = await AdminService.resolveWarning(
          warningId,
          adminId,
          actionTaken,
     );

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Warning resolved',
          data: result,
     });
});

export const AdminController = {
     deleteAdmin,
     createAdmin,
     getAdmin,
     getAdminProfile,
     updateAdminProfile,
     changePassword,
     adminLogin,
     adminForgetPassword,
     adminVerifyResetOtp,
     adminResetPassword,
     adminResendOtp,
     getActiveStreams,
     getStreamMonitoring,
     warnStreamer,
     endStream,
     getStreamerWarnings,
     resolveWarning,
};
