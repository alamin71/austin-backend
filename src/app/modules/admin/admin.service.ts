import { StatusCodes } from 'http-status-codes';
import { Secret } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import AppError from '../../../errors/AppError.js';
import { IUser } from '../user/user.interface.js';
import { User } from '../user/user.model.js';
import config from '../../../config/index.js';
import { emailHelper } from '../../../helpers/emailHelper.js';
import { jwtHelper } from '../../../helpers/jwtHelper.js';
import { emailTemplate } from '../../../shared/emailTemplate.js';
import generateOTP from '../../../utils/generateOTP.js';
import { verifyToken } from '../../../utils/verifyToken.js';
import { createToken } from '../../../utils/createToken.js';

const createAdminToDB = async (payload: IUser): Promise<IUser> => {
     const createAdmin: any = await User.create(payload);
     if (!createAdmin) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to create Admin');
     }
     if (createAdmin) {
          await User.findByIdAndUpdate({ _id: createAdmin?._id }, { verified: true }, { new: true });
     }
     return createAdmin;
};

const deleteAdminFromDB = async (id: any): Promise<IUser | undefined> => {
     const isExistAdmin = await User.findByIdAndDelete(id);
     if (!isExistAdmin) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to delete Admin');
     }
     return;
};

const getAdminFromDB = async (): Promise<IUser[]> => {
     const admins = await User.find({ role: 'ADMIN' }).select('name email profile contact location');
     return admins;
};

const getAdminProfileById = async (adminId: string): Promise<IUser | null> => {
     const admin = await User.findById(adminId).select('_id name userName email role image status verified isDeleted createdAt updatedAt');
     if (!admin) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Admin not found');
     }
     return admin;
};

const updateAdminProfile = async (adminId: string, payload: any, file?: any): Promise<IUser | null> => {
     const admin = await User.findById(adminId);
     if (!admin) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Admin not found');
     }

     // Update allowed fields only
     const updateData: any = {};
     
     if (payload.name) {
          updateData.name = payload.name;
     }
     if (payload.userName) {
          updateData.userName = payload.userName;
     }
     if (payload.email) {
          updateData.email = payload.email;
     }

     // Handle image upload
     if (file) {
          const { uploadFileToS3 } = await import('../../../helpers/s3Helper.js');
          const s3Url = await uploadFileToS3(file, 'admin/profile');
          updateData.image = s3Url;
     }

     const result = await User.findByIdAndUpdate(
          { _id: adminId },
          updateData,
          { new: true }
     ).select('_id name userName email role image status verified isDeleted createdAt updatedAt');

     return result;
};

const changePasswordToDB = async (adminId: string, payload: any): Promise<IUser | null> => {
     const { currentPassword, newPassword, confirmPassword } = payload;
     const admin = await User.findById(adminId).select('+password');
     
     if (!admin) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Admin not found');
     }

     // Verify current password
     if (!admin.password || !(await User.isMatchPassword(currentPassword, admin.password))) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Current password is incorrect');
     }

     if (currentPassword === newPassword) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'New password must be different from current password');
     }

     if (newPassword !== confirmPassword) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Passwords do not match');
     }

     const bcrypt = await import('bcrypt');
     const config = (await import('../../../config/index.js')).default;
     const hashPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));
     
     const result = await User.findByIdAndUpdate(
          { _id: adminId },
          { password: hashPassword },
          { new: true }
     ).select('_id name userName email role image status verified isDeleted createdAt updatedAt');
     
     return result;
};

const adminLoginToDB = async (payload: any) => {
     const { email, password } = payload;
     if (!password) throw new AppError(StatusCodes.BAD_REQUEST, 'Password is required!');

     const admin = await User.findOne({ email }).select('+password');
     if (!admin) throw new AppError(StatusCodes.BAD_REQUEST, 'Admin does not exist!');

     if (admin?.status === 'blocked') throw new AppError(StatusCodes.BAD_REQUEST, 'Your account has been blocked.');

     if (!admin.password || !(await User.isMatchPassword(password, admin.password))) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Password is incorrect!');
     }

     const jwtData = { id: admin._id, role: admin.role, email: admin.email, userName: admin.userName };
     const accessToken = jwtHelper.createToken(jwtData, config.jwt.jwt_secret as Secret, config.jwt.jwt_expire_in as string);
     const refreshToken = jwtHelper.createToken(jwtData, config.jwt.jwt_refresh_secret as string, config.jwt.jwt_refresh_expire_in as string);

     return { accessToken, refreshToken, role: admin.role, email: admin.email, userName: admin.userName, admin };
};

const adminForgetPasswordToDB = async (email: string) => {
     const admin = await User.findOne({ email });
     if (!admin) throw new AppError(StatusCodes.BAD_REQUEST, 'Admin does not exist!');

     const otp = generateOTP(6);
     const value = { otp, email: admin.email };
     const emailContent = emailTemplate.resetPassword(value);
     await emailHelper.sendEmail(emailContent);

     const authentication = { oneTimeCode: otp, expireAt: new Date(Date.now() + 3 * 60000) };
     await User.findOneAndUpdate({ email }, { $set: { authentication } });

     return { otp, email: admin.email };
};

const adminVerifyResetOtpToDB = async (payload: any) => {
     const { email, oneTimeCode } = payload;
     const admin = await User.findOne({ email }).select('+authentication');
     if (!admin) throw new AppError(StatusCodes.BAD_REQUEST, 'Admin does not exist!');
     if (!oneTimeCode) throw new AppError(StatusCodes.BAD_REQUEST, 'Please give the OTP');
     if (admin.authentication?.oneTimeCode !== oneTimeCode) throw new AppError(StatusCodes.BAD_REQUEST, 'Wrong OTP');
     if (new Date() > admin.authentication?.expireAt!) throw new AppError(StatusCodes.BAD_REQUEST, 'OTP expired');

     const jwtPayload = { id: admin._id.toString(), email: admin.email, role: admin.role };
     const resetToken = createToken(jwtPayload, config.jwt.jwt_secret as string, '10m');

     await User.findByIdAndUpdate(admin._id, { authentication: { oneTimeCode: null, expireAt: null } });

     return {
          message: 'OTP verified successfully. You can now reset your password.',
          type: 'forget_password_verification',
          email: admin.email,
          resetToken,
     };
};

const adminResetPasswordToDB = async (token: string, payload: any) => {
     const { newPassword, confirmPassword } = payload;
     let decodedToken;
     try {
          decodedToken = await verifyToken(token, config.jwt.jwt_secret as Secret);
     } catch (error) {
          throw new AppError(StatusCodes.UNAUTHORIZED, 'Invalid or expired reset token');
     }

     const { id } = decodedToken;
     const admin = await User.findById(id);
     if (!admin) throw new AppError(StatusCodes.BAD_REQUEST, 'Admin not found');

     if (newPassword !== confirmPassword) throw new AppError(StatusCodes.BAD_REQUEST, 'Passwords do not match!');

     const hashPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));
     const result = await User.findByIdAndUpdate(id, { password: hashPassword }, { new: true }).select('_id name userName email role image status verified isDeleted createdAt updatedAt');

     return result;
};

const adminResendOtpToDB = async (email: string) => {
     const admin = await User.findOne({ email });
     if (!admin || !admin._id) throw new AppError(StatusCodes.BAD_REQUEST, 'Admin does not exist!');

     const otp = generateOTP(6);
     const values = { name: admin.name, otp, email: admin.email };
     const emailContent = emailTemplate.createAccount(values);
     await emailHelper.sendEmail(emailContent);

     const authentication = { oneTimeCode: otp, expireAt: new Date(Date.now() + 3 * 60000) };
     await User.findOneAndUpdate({ _id: admin._id }, { $set: { authentication } });

     return { otp, email: admin.email, message: `OTP sent successfully to ${admin.email}` };
};

export const AdminService = {
     createAdminToDB,
     deleteAdminFromDB,
     getAdminFromDB,
     getAdminProfileById,
     updateAdminProfile,
     changePasswordToDB,
     adminLoginToDB,
     adminForgetPasswordToDB,
     adminVerifyResetOtpToDB,
     adminResetPasswordToDB,
     adminResendOtpToDB,
};
