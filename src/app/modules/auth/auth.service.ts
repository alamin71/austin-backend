import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../../../config/index.js';
import { emailHelper } from '../../../helpers/emailHelper.js';
import { jwtHelper } from '../../../helpers/jwtHelper.js';
import { emailTemplate } from '../../../shared/emailTemplate.js';
import { IAuthResetPassword, IChangePassword, ILoginData, IVerifyEmail } from '../../../types/auth.js';
import { User } from '../user/user.model.js';
import AppError from '../../../errors/AppError.js';
import generateOTP from '../../../utils/generateOTP.js';
import { verifyToken } from '../../../utils/verifyToken.js';
import { createToken } from '../../../utils/createToken.js';
import { uploadFileToS3 } from '../../../helpers/s3Helper.js';
import { USER_ROLES } from '../../../enums/user.js';
import { detectDevice } from '../../../helpers/deviceDetector.js';
import { v4 as uuidv4 } from 'uuid';

interface IRegisterData {
     name: string;
     userName: string;
     email: string;
     password: string;
     confirmPassword: string;
     bio?: string;
     socialLinks?: {
          x?: string;
          instagram?: string;
          youtube?: string;
     };
}
const registerUserToDB = async (payload: IRegisterData, file?: any) => {
     try {
          // null-prototype + trim + normalize
          const normal = JSON.parse(JSON.stringify(payload));
          const name = (normal.name || '').trim();
          const userName = (normal.userName || '').trim().toLowerCase();
          const email = (normal.email || '').trim().toLowerCase();
          const password = normal.password;
          const bio = normal.bio || '';
          const socialLinks = normal.socialLinks || { x: '', instagram: '', youtube: '' };

          console.log('🔍 registerUserToDB with:', { name, userName, email });
          const existingUser = await User.findOne({ email });

          if (existingUser?.verified) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Email already exists!');
          }

          let imageUrl = '';
          if (file) {
               imageUrl = await uploadFileToS3(file, 'profile-images');
               console.log('📸 Image uploaded to S3:', imageUrl);
          }
          const otp = generateOTP(6);
          const authentication = { oneTimeCode: otp, expireAt: new Date(Date.now() + 10 * 60000) };

          const userData = {
               name,
               userName,
               email,
               password,
               verified: false,
               authentication,
               bio,
               image: imageUrl,
               socialLinks,
          } as const;

          let user;
          if (existingUser && !existingUser.verified) {
               console.log('♻️ Existing unverified account found. Updating and resending OTP.');
               const updatePayload: Record<string, unknown> = {
                    name,
                    userName,
                    password,
                    verified: false,
                    authentication,
                    bio,
                    socialLinks,
               };

               if (imageUrl) {
                    updatePayload.image = imageUrl;
               }

               user = await User.findByIdAndUpdate(existingUser._id, { $set: updatePayload }, { new: true, runValidators: true });
          } else {
               console.log('Creating user with:', userData);
               user = await User.create(userData);
               console.log('User created:', user._id);
          }

          const value = { name, otp, email };
          const verificationEmail = emailTemplate.createAccount(value);
          await emailHelper.sendEmail(verificationEmail);
          console.log('Email sent to:', email);

          return {
               _id: user._id,
               name: user.name,
               userName: user.userName,
               email: user.email,
               bio: user.bio,
               image: user.image,
               socialLinks: user.socialLinks,
               role: user.role,
               status: user.status,
               verified: user.verified,
               otp,
          };
     } catch (err: any) {
          // duplicate key error handle
          if (err?.code === 11000) {
               if (err.keyPattern?.email) throw new AppError(StatusCodes.BAD_REQUEST, 'Email already exists!');
               if (err.keyPattern?.userName) throw new AppError(StatusCodes.BAD_REQUEST, 'Username already exists!');
               throw new AppError(StatusCodes.BAD_REQUEST, 'Duplicate key error');
          }
          console.error('❌ Error in registerUserToDB:', err.message);
          throw err;
     }
};

const loginUserFromDB = async (
     payload: ILoginData,
     userAgent?: string,
     ip?: string,
     appVersion?: string,
) => {
     const { email, password } = payload;
     if (!password) throw new AppError(StatusCodes.BAD_REQUEST, 'Password is required!');

     const isExistUser = await User.findOne({ email }).select('+password');
     if (!isExistUser) throw new AppError(StatusCodes.BAD_REQUEST, 'User does not exist!');

     // Skip verification check for admin/super_admin
     const adminRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN];
     if (!adminRoles.includes(isExistUser.role as USER_ROLES) && !isExistUser.verified) {
          const otp = generateOTP(6);
          const value = { otp, email: isExistUser.email, name: isExistUser.name };
          const emailContent = emailTemplate.createAccount(value);
          await emailHelper.sendEmail(emailContent);

          const authentication = { oneTimeCode: otp, expireAt: new Date(Date.now() + 3 * 60000) };
          await User.findOneAndUpdate({ email }, { $set: { authentication } });

          return {
               requiresVerification: true,
               message: 'OTP sent to your email. Please verify to complete login.',
               email: isExistUser.email,
               otp,
          };
     }

     if (isExistUser?.status === 'blocked') throw new AppError(StatusCodes.BAD_REQUEST, 'Your account has been blocked.');

     if (!isExistUser.password || !(await User.isMatchPassword(password, isExistUser.password))) throw new AppError(StatusCodes.BAD_REQUEST, 'Password is incorrect!');

     const shouldReactivate = isExistUser.status === 'inactive';

     // 2FA login flow: password is valid, now require OTP verification
     if (isExistUser.securitySettings?.twoFactorEnabled) {
          const otp = generateOTP(6);
          const value = { otp, email: isExistUser.email };
          const emailContent = emailTemplate.twoFactorLogin(value);
          await emailHelper.sendEmail(emailContent);

          const authentication = { oneTimeCode: otp, expireAt: new Date(Date.now() + 3 * 60000) };
          await User.findOneAndUpdate({ _id: isExistUser._id }, { $set: { authentication } });

          const twoFactorToken = createToken(
               {
                    id: isExistUser._id.toString(),
                    email: isExistUser.email,
                    role: isExistUser.role,
                    purpose: 'login_2fa',
               },
               config.jwt.jwt_secret as string,
               '10m',
          );

          return {
               requiresTwoFactor: true,
               twoFactorToken,
               email: isExistUser.email,
               role: isExistUser.role,
               otp,
          };
     }

     const jwtData = { id: isExistUser._id, role: isExistUser.role, email: isExistUser.email, userName: isExistUser.userName };
     const accessToken = jwtHelper.createToken(jwtData, config.jwt.jwt_secret as Secret, config.jwt.jwt_expire_in as string);
     const refreshToken = jwtHelper.createToken(jwtData, config.jwt.jwt_refresh_secret as string, config.jwt.jwt_refresh_expire_in as string);

     // Detect device and create session
     const deviceInfo = detectDevice(userAgent || '', appVersion);
     const sessionId = uuidv4();
     const newSession = {
          deviceType: deviceInfo.deviceType,
          deviceName: deviceInfo.deviceName,
          platform: deviceInfo.platform,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          appVersion: deviceInfo.appVersion,
          lastActive: new Date(),
          loginTime: new Date(),
          ip: ip || null,
          sessionId,
     };

     // Track session and reactivate if needed
     await User.findByIdAndUpdate(isExistUser._id, {
          $set: shouldReactivate ? { status: 'active' } : {},
          $push: { 'securitySettings.activeSessions': newSession },
     });

     return {
          requiresTwoFactor: false,
          accessToken,
          refreshToken,
          role: isExistUser.role,
          email: isExistUser.email,
          userName: isExistUser.userName,
     };
};

const verifyLoginTwoFactorOtpToDB = async (
     payload: { twoFactorToken: string; oneTimeCode: number },
     userAgent?: string,
     ip?: string,
     appVersion?: string,
) => {
     const { twoFactorToken, oneTimeCode } = payload;

     if (!twoFactorToken) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Two factor token is required');
     }

     if (!oneTimeCode) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'OTP is required');
     }

     let decodedToken: any;
     try {
          decodedToken = await verifyToken(twoFactorToken, config.jwt.jwt_secret as Secret);
     } catch (error) {
          throw new AppError(StatusCodes.UNAUTHORIZED, 'Invalid or expired two factor token');
     }

     if (decodedToken?.purpose !== 'login_2fa') {
          throw new AppError(StatusCodes.UNAUTHORIZED, 'Invalid two factor token purpose');
     }

     const user = await User.findById(decodedToken.id).select('+authentication');
     if (!user) {
          throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
     }

     if (!user.authentication?.oneTimeCode || user.authentication.oneTimeCode !== oneTimeCode) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Wrong OTP');
     }

     if (new Date() > user.authentication.expireAt) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'OTP expired');
     }

     // Detect device and create session
     const deviceInfo = detectDevice(userAgent || '', appVersion);
     const sessionId = uuidv4();
     const newSession = {
          deviceType: deviceInfo.deviceType,
          deviceName: deviceInfo.deviceName,
          platform: deviceInfo.platform,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          appVersion: deviceInfo.appVersion,
          lastActive: new Date(),
          loginTime: new Date(),
          ip: ip || null,
          sessionId,
     };

     await User.findByIdAndUpdate(user._id, {
          $set: {
               status: 'active',
               authentication: {
                    oneTimeCode: null,
                    expireAt: null,
               },
          },
          $push: { 'securitySettings.activeSessions': newSession },
     });

     const jwtData = {
          id: user._id,
          role: user.role,
          email: user.email,
          userName: user.userName,
     };

     const accessToken = jwtHelper.createToken(
          jwtData,
          config.jwt.jwt_secret as Secret,
          config.jwt.jwt_expire_in as string,
     );
     const refreshToken = jwtHelper.createToken(
          jwtData,
          config.jwt.jwt_refresh_secret as string,
          config.jwt.jwt_refresh_expire_in as string,
     );

     return {
          accessToken,
          refreshToken,
          role: user.role,
          email: user.email,
          userName: user.userName,
     };
};

const verifyEmailToDB = async (payload: IVerifyEmail) => {
     const { email, oneTimeCode } = payload;
     const user = await User.findOne({ email }).select('+authentication');
     if (!user) throw new AppError(StatusCodes.BAD_REQUEST, 'User does not exist!');
     if (!oneTimeCode) throw new AppError(StatusCodes.BAD_REQUEST, 'Please give the otp');
     if (user.authentication?.oneTimeCode !== oneTimeCode) throw new AppError(StatusCodes.BAD_REQUEST, 'Wrong OTP');
     if (new Date() > user.authentication?.expireAt) throw new AppError(StatusCodes.BAD_REQUEST, 'OTP expired');

     if (!user.verified) {
          await User.findByIdAndUpdate(user._id, { verified: true, authentication: { oneTimeCode: null, expireAt: null } });
          return { message: 'Email verified successfully' };
     }

     await User.findByIdAndUpdate(user._id, { authentication: { oneTimeCode: null, expireAt: null } });
     return { message: 'Email already verified successfully' };
};

const forgetPasswordToDB = async (email: string) => {
     const isExistUser = await User.isExistUserByEmail(email);
     if (!isExistUser) throw new AppError(StatusCodes.BAD_REQUEST, 'User does not exist!');

     const otp = generateOTP(6);
     const value = { otp, email: isExistUser.email };
     const emailContent = emailTemplate.resetPassword(value);
     await emailHelper.sendEmail(emailContent);

     const authentication = { oneTimeCode: otp, expireAt: new Date(Date.now() + 3 * 60000) };
     await User.findOneAndUpdate({ email }, { $set: { authentication } });

     return { otp, email: isExistUser.email };
};

const verifyResetOtpToDB = async (payload: IVerifyEmail) => {
     const { email, oneTimeCode } = payload;
     const user = await User.findOne({ email }).select('+authentication');
     if (!user) throw new AppError(StatusCodes.BAD_REQUEST, 'User does not exist!');
     if (!oneTimeCode) throw new AppError(StatusCodes.BAD_REQUEST, 'Please give the OTP');
     if (user.authentication?.oneTimeCode !== oneTimeCode) throw new AppError(StatusCodes.BAD_REQUEST, 'Wrong OTP');
     if (new Date() > user.authentication?.expireAt) throw new AppError(StatusCodes.BAD_REQUEST, 'OTP expired');

     const jwtPayload = { id: user._id.toString(), email: user.email, role: user.role };
     const resetToken = createToken(jwtPayload, config.jwt.jwt_secret as string, '10m');

     await User.findByIdAndUpdate(user._id, { authentication: { oneTimeCode: null, expireAt: null } });

     return {
          message: 'OTP verified successfully. You can now reset your password.',
          type: 'forget_password_verification',
          email: user.email,
          resetToken,
     };
};

const resetPasswordToDB = async (token: string, payload: IAuthResetPassword) => {
     const { newPassword, confirmPassword } = payload;
     let decodedToken;
     try {
          decodedToken = await verifyToken(token, config.jwt.jwt_secret as Secret);
     } catch (error) {
          throw new AppError(StatusCodes.UNAUTHORIZED, 'Invalid or expired reset token');
     }

     const { id } = decodedToken;
     const user = await User.findById(id);
     if (!user) throw new AppError(StatusCodes.BAD_REQUEST, 'User not found');

     if (newPassword !== confirmPassword) throw new AppError(StatusCodes.BAD_REQUEST, 'Passwords do not match!');

     const hashPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));
     await User.findByIdAndUpdate(id, { password: hashPassword }, { new: true });

     return { message: 'Password reset successfully' };
};

const resendOtpFromDb = async (email: string) => {
     const isExistUser = await User.isExistUserByEmail(email);
     if (!isExistUser || !isExistUser._id) throw new AppError(StatusCodes.BAD_REQUEST, 'User does not exist!');

     const otp = generateOTP(6);
     const values = { name: isExistUser.name, otp, email: isExistUser.email! };
     const emailContent = emailTemplate.createAccount(values);
     await emailHelper.sendEmail(emailContent);

     const authentication = { oneTimeCode: otp, expireAt: new Date(Date.now() + 3 * 60000) };
     await User.findOneAndUpdate({ _id: isExistUser._id }, { $set: { authentication } });

     return { otp, email: isExistUser.email, message: `OTP sent successfully to ${isExistUser.email}` };
};

const forgetPasswordByUrlToDB = async (email: string) => {
     const isExistUser = await User.isExistUserByEmail(email);
     if (!isExistUser || !isExistUser._id) throw new AppError(StatusCodes.BAD_REQUEST, 'User does not exist!');
     if (isExistUser.status === 'blocked') throw new AppError(StatusCodes.FORBIDDEN, 'This user is blocked!');

     const jwtPayload = { id: isExistUser._id, email: isExistUser.email, role: isExistUser.role };
     const resetToken = createToken(jwtPayload, config.jwt.jwt_secret as string, config.reset_pass_expire_time as string);
     const resetUrl = `${config.frontend_url}/auth/login/set_password?email=${isExistUser.email}&token=${resetToken}`;
     const emailContent = emailTemplate.resetPasswordByUrl({ email: isExistUser.email, resetUrl });

     await emailHelper.sendEmail(emailContent);
};

const resetPasswordByUrl = async (token: string, payload: IAuthResetPassword) => {
     const { newPassword, confirmPassword } = payload;
     let decodedToken;
     try {
          decodedToken = await verifyToken(token, config.jwt.jwt_secret as Secret);
     } catch (error) {
          throw new AppError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token.');
     }

     const { id } = decodedToken;
     const user = await User.findById(id);
     if (!user) throw new AppError(StatusCodes.BAD_REQUEST, 'User not found.');

     if (newPassword !== confirmPassword) throw new AppError(StatusCodes.BAD_REQUEST, 'Passwords do not match!');

     const hashPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));
     await User.findByIdAndUpdate(id, { password: hashPassword }, { new: true, runValidators: true });

     return { message: 'Password reset successful. You can now log in with your new password.' };
};

const changePasswordToDB = async (user: JwtPayload, payload: IChangePassword) => {
     const { currentPassword, newPassword, confirmPassword } = payload;
     const isExistUser = await User.findById(user.id).select('+password');
     if (!isExistUser) throw new AppError(StatusCodes.BAD_REQUEST, 'User does not exist!');

     if (currentPassword && (!isExistUser.password || !(await User.isMatchPassword(currentPassword, isExistUser.password)))) throw new AppError(StatusCodes.BAD_REQUEST, 'Password is incorrect');

     if (currentPassword === newPassword) throw new AppError(StatusCodes.BAD_REQUEST, 'New password must be different from current password');

     if (newPassword !== confirmPassword) throw new AppError(StatusCodes.BAD_REQUEST, 'Passwords do not match');

     const hashPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));
     const result = await User.findOneAndUpdate({ _id: user.id }, { password: hashPassword }, { new: true });
     return result;
};

const refreshToken = async (token: string) => {
     if (!token) throw new AppError(StatusCodes.BAD_REQUEST, 'Token not found');

     const decoded = verifyToken(token, config.jwt.jwt_refresh_secret as string);
     const { id } = decoded;

     const activeUser = await User.findById(id);
     if (!activeUser) throw new AppError(StatusCodes.NOT_FOUND, 'User not found');

     if (activeUser.status !== 'active') throw new AppError(StatusCodes.FORBIDDEN, 'User account is inactive');
     if (!activeUser.verified) throw new AppError(StatusCodes.FORBIDDEN, 'User account is not verified');
     if (activeUser.isDeleted) throw new AppError(StatusCodes.FORBIDDEN, 'User account is deleted');

     const jwtPayload = { id: activeUser._id?.toString() as string, role: activeUser.role, email: activeUser.email };
     const accessToken = jwtHelper.createToken(jwtPayload, config.jwt.jwt_secret as Secret, config.jwt.jwt_expire_in as string);

     return { accessToken };
};

// Generate both access and refresh tokens
const generateTokens = async (user: any) => {
     const jwtPayload = {
          id: user._id.toString(),
          role: user.role || 'user',
          email: user.email,
     };

     const accessToken = createToken(jwtPayload, process.env.JWT_SECRET || '', process.env.JWT_EXPIRE_IN || '7d');
     const refreshToken = createToken(jwtPayload, process.env.JWT_REFRESH_SECRET || '', process.env.JWT_REFRESH_EXPIRE_IN || '365d');

     return {
          accessToken,
          refreshToken,
     };
};

export const AuthService = {
     registerUserToDB,
     verifyEmailToDB,
     verifyResetOtpToDB,
     loginUserFromDB,
     verifyLoginTwoFactorOtpToDB,
     forgetPasswordToDB,
     resetPasswordToDB,
     changePasswordToDB,
     forgetPasswordByUrlToDB,
     resetPasswordByUrl,
     resendOtpFromDb,
     refreshToken,
     generateTokens,
};
