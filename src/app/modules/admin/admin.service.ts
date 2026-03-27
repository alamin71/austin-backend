import { StatusCodes } from 'http-status-codes';
import { Secret } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import AppError from '../../../errors/AppError.js';
import { IUser } from '../user/user.interface.js';
import { User } from '../user/user.model.js';
import { Stream } from '../stream/stream.model.js';
import { StreamWarning } from '../stream/streamWarning.model.js';
import { Subscription } from '../subscription/subscription.model.js';
import { GiftTransaction } from '../gift/gift.model.js';
import { Wallet, WalletTransaction } from '../wallet/wallet.model.js';
import { AdminPayout } from './adminPayout.model.js';
import config from '../../../config/index.js';
import { emailHelper } from '../../../helpers/emailHelper.js';
import { jwtHelper } from '../../../helpers/jwtHelper.js';
import { emailTemplate } from '../../../shared/emailTemplate.js';
import { logger, errorLogger } from '../../../shared/logger.js';
import generateOTP from '../../../utils/generateOTP.js';
import { verifyToken } from '../../../utils/verifyToken.js';
import { createToken } from '../../../utils/createToken.js';

const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const parseYear = (rawYear?: string) => {
     const nowYear = new Date().getUTCFullYear();
     const parsed = Number.parseInt(String(rawYear || ''), 10);
     if (!Number.isFinite(parsed) || parsed < 2000 || parsed > 2100) return nowYear;
     return parsed;
};

const formatGrowthLabel = (value: number) => {
     const rounded = Number.isFinite(value) ? Number(value.toFixed(1)) : 0;
     const sign = rounded > 0 ? '+' : '';
     return `${sign}${rounded}% from last month`;
};

const calcGrowth = (current: number, previous: number) => {
     if (previous <= 0) {
          if (current <= 0) return 0;
          return 100;
     }
     return ((current - previous) / previous) * 100;
};

const formatCurrency = (value: number) => {
     return `$${Math.round(value).toLocaleString('en-US')}`;
};

const toRegion = (locationValue: unknown) => {
     const text = String(locationValue || '').toLowerCase();
     if (!text) return null;

     if (/usa|united states|canada|mexico/.test(text)) return 'North America';
     if (/uk|united kingdom|england|france|germany|italy|spain|europe/.test(text)) return 'Europe';
     if (/india|pakistan|bangladesh|china|japan|asia/.test(text)) return 'Asia Pacific';
     if (/brazil|argentina|chile|colombia|peru|south america/.test(text)) return 'South America';
     return 'Others';
};

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

// Stream Management Functions
const getActiveStreams = async () => {
     const activeStreams = await Stream.find({ status: 'live' })
          .populate('streamer', 'name userName image email')
          .populate('category', 'name')
          .sort({ createdAt: -1 });

     return {
          streams: activeStreams,
          count: activeStreams.length,
     };
};

const getSingleActiveStream = async (streamId: string) => {
     const stream = await Stream.findOne({ _id: streamId, status: 'live' })
          .populate('streamer', 'name userName image email')
          .populate('category', 'name');

     if (!stream) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Active stream not found');
     }

     return stream;
};

const getStreamMonitoring = async () => {
     const activeStreams = await Stream.find({ status: 'live' })
          .populate('streamer', 'name userName email image')
          .populate('category', 'name')
          .select(
               'title streamer category status currentViewerCount peakViewerCount startedAt duration',
          )
          .sort({ startedAt: -1 });

     const totalViewers = activeStreams.reduce(
          (sum, stream) => sum + (stream.currentViewerCount || 0),
          0,
     );

     const peakConcurrent = activeStreams.reduce(
          (max, stream) => Math.max(max, stream.currentViewerCount || 0),
          0,
     );

     const warningsCount = await StreamWarning.countDocuments({
          status: 'active',
     });

     // Get flagged count for each stream
     const streamsWithFlags = await Promise.all(
          activeStreams.map(async (stream) => {
               const flaggedCount = await StreamWarning.countDocuments({
                    stream: stream._id,
                    status: 'active',
               });
               return {
                    ...stream.toObject(),
                    flaggedCount,
               };
          }),
     );

     return {
          activeStreamsCount: activeStreams.length,
          totalViewers,
          peakConcurrent,
          warningsCount,
          streams: streamsWithFlags,
     };
};

const getSingleStreamMonitoring = async (streamId: string) => {
     const stream = await Stream.findById(streamId)
          .populate('streamer', 'name userName email image')
          .populate('category', 'name')
          .select(
               'title streamer category status currentViewerCount peakViewerCount startedAt duration',
          );

     if (!stream) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
     }

     const flaggedCount = await StreamWarning.countDocuments({
          stream: stream._id,
          status: 'active',
     });

     return {
          ...stream.toObject(),
          flaggedCount,
     };
};

const warnStreamer = async (
     adminId: string,
     streamId: string,
     reason: string,
     severity: 'warning' | 'critical' | 'violation',
     description: string,
) => {
     const stream = await Stream.findById(streamId).populate('streamer');

     if (!stream) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
     }

     const admin = await User.findById(adminId);
     if (!admin) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Admin not found');
     }

     const warning = await StreamWarning.create({
          stream: streamId,
          streamer: stream.streamer._id,
          admin: adminId,
          reason,
          severity,
          description,
          status: 'active',
     });

     // Send email to streamer about warning
     const streamer = await User.findById(stream.streamer._id);
     if (streamer) {
          const emailData = {
               name: streamer.name,
               streamTitle: stream.title,
               reason,
               description,
               severity,
          };
          // Send warning email
          // await emailHelper.sendEmail(...);
     }

     return warning.populate('streamer', 'name email');
};

const endStream = async (adminId: string, streamId: string, reason?: string) => {
     const stream = await Stream.findById(streamId).populate('streamer');

     if (!stream) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Stream not found');
     }

     if (stream.status !== 'live') {
          throw new AppError(
               StatusCodes.BAD_REQUEST,
               'Only live streams can be ended',
          );
     }

     const endedStream = await Stream.findByIdAndUpdate(
          streamId,
          {
               status: 'ended',
               endedAt: new Date(),
          },
          { new: true },
     );

     // If reason provided, create a warning
     if (reason) {
          await StreamWarning.create({
               stream: streamId,
               streamer: stream.streamer._id,
               admin: adminId,
               reason: 'inappropriate_content',
               description: reason,
               severity: 'critical',
               actionTaken: 'Stream ended by admin',
               status: 'active',
          });

          // Send email to streamer
          const streamer = await User.findById(stream.streamer._id);
          if (streamer) {
               // Send email notification
          }
     }

     return endedStream;
};

const getStreamerWarnings = async (streamerId: string) => {
     const warnings = await StreamWarning.find({ streamer: streamerId })
          .populate('stream', 'title status')
          .populate('admin', 'name email')
          .sort({ createdAt: -1 });

     return {
          warnings,
          totalWarnings: warnings.length,
          activeWarnings: warnings.filter((warning) => warning.status === 'active').length,
     };
};

const getDashboardOverview = async (query: Record<string, string>) => {
     const year = parseYear(query.year);
     const now = new Date();

     const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
     const yearEnd = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));

     const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
     const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));

     const last24hStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

     const [
          totalUsers,
          regularUsers,
          liveNow,
          peak24hAgg,
          totalEarningsAgg,
          thisMonthUsers,
          prevMonthUsers,
          thisMonthRegularUsers,
          prevMonthRegularUsers,
          thisMonthEarningsAgg,
          prevMonthEarningsAgg,
          monthlyUsersAgg,
          monthlyEarningsAgg,
          recentUsers,
          recentStreams,
          usersForGeo,
     ] = await Promise.all([
          User.countDocuments({ role: 'USER', isDeleted: { $ne: true } }),
          User.countDocuments({ role: 'USER', status: 'active', isDeleted: { $ne: true } }),
          Stream.countDocuments({ status: 'live' }),
          Stream.aggregate([
               { $match: { createdAt: { $gte: last24hStart } } },
               { $group: { _id: null, maxPeak: { $max: '$peakViewerCount' } } },
          ]),
          GiftTransaction.aggregate([
               { $match: { status: 'completed' } },
               {
                    $group: {
                         _id: null,
                         total: {
                              $sum: {
                                   $ifNull: ['$metadata.usdValue', '$totalAmount'],
                              },
                         },
                    },
               },
          ]),
          User.countDocuments({ role: 'USER', isDeleted: { $ne: true }, createdAt: { $gte: thisMonthStart } }),
          User.countDocuments({ role: 'USER', isDeleted: { $ne: true }, createdAt: { $gte: prevMonthStart, $lt: thisMonthStart } }),
          User.countDocuments({ role: 'USER', status: 'active', isDeleted: { $ne: true }, createdAt: { $gte: thisMonthStart } }),
          User.countDocuments({ role: 'USER', status: 'active', isDeleted: { $ne: true }, createdAt: { $gte: prevMonthStart, $lt: thisMonthStart } }),
          GiftTransaction.aggregate([
               { $match: { status: 'completed', createdAt: { $gte: thisMonthStart } } },
               {
                    $group: {
                         _id: null,
                         total: {
                              $sum: {
                                   $ifNull: ['$metadata.usdValue', '$totalAmount'],
                              },
                         },
                    },
               },
          ]),
          GiftTransaction.aggregate([
               { $match: { status: 'completed', createdAt: { $gte: prevMonthStart, $lt: thisMonthStart } } },
               {
                    $group: {
                         _id: null,
                         total: {
                              $sum: {
                                   $ifNull: ['$metadata.usdValue', '$totalAmount'],
                              },
                         },
                    },
               },
          ]),
          User.aggregate([
               { $match: { role: 'USER', isDeleted: { $ne: true }, createdAt: { $gte: yearStart, $lt: yearEnd } } },
               {
                    $group: {
                         _id: { month: { $month: '$createdAt' } },
                         count: { $sum: 1 },
                    },
               },
          ]),
          GiftTransaction.aggregate([
               { $match: { status: 'completed', createdAt: { $gte: yearStart, $lt: yearEnd } } },
               {
                    $group: {
                         _id: { month: { $month: '$createdAt' } },
                         amount: {
                              $sum: {
                                   $ifNull: ['$metadata.usdValue', '$totalAmount'],
                              },
                         },
                    },
               },
          ]),
          User.find({ role: 'USER', isDeleted: { $ne: true }, createdAt: { $gte: last24hStart } }).select('createdAt').lean(),
          Stream.find({ createdAt: { $gte: last24hStart } }).select('createdAt').lean(),
          User.find({ role: 'USER', isDeleted: { $ne: true } }).select('location').lean(),
     ]);

     const monthlyUsers = new Array(12).fill(0);
     monthlyUsersAgg.forEach((row: any) => {
          const idx = Number(row?._id?.month || 0) - 1;
          if (idx >= 0 && idx < 12) monthlyUsers[idx] = row.count || 0;
     });

     const monthlyEarnings = new Array(12).fill(0);
     monthlyEarningsAgg.forEach((row: any) => {
          const idx = Number(row?._id?.month || 0) - 1;
          if (idx >= 0 && idx < 12) monthlyEarnings[idx] = Math.round(row.amount || 0);
     });

     const totalEarnings = totalEarningsAgg[0]?.total || 0;
     const thisMonthEarnings = thisMonthEarningsAgg[0]?.total || 0;
     const prevMonthEarnings = prevMonthEarningsAgg[0]?.total || 0;
     const peak24h = peak24hAgg[0]?.maxPeak || 0;

     const userGrowth = calcGrowth(thisMonthUsers, prevMonthUsers);
     const regularUserGrowth = calcGrowth(thisMonthRegularUsers, prevMonthRegularUsers);
     const earningsGrowth = calcGrowth(thisMonthEarnings, prevMonthEarnings);

     const activityLabels = Array.from({ length: 8 }, (_, i) => {
          const slotStart = new Date(last24hStart.getTime() + i * 3 * 60 * 60 * 1000);
          return `${slotStart.getUTCHours()}:00`;
     });

     const usersSeries = new Array(8).fill(0);
     recentUsers.forEach((item: any) => {
          const diffMs = new Date(item.createdAt).getTime() - last24hStart.getTime();
          const idx = Math.floor(diffMs / (3 * 60 * 60 * 1000));
          if (idx >= 0 && idx < 8) usersSeries[idx] += 1;
     });

     const streamsSeries = new Array(8).fill(0);
     recentStreams.forEach((item: any) => {
          const diffMs = new Date(item.createdAt).getTime() - last24hStart.getTime();
          const idx = Math.floor(diffMs / (3 * 60 * 60 * 1000));
          if (idx >= 0 && idx < 8) streamsSeries[idx] += 1;
     });

     const regionCounts: Record<string, number> = {
          'North America': 0,
          Europe: 0,
          'Asia Pacific': 0,
          'South America': 0,
          Others: 0,
     };

     usersForGeo.forEach((user: any) => {
          const region = toRegion(user?.location?.country || user?.location);
          if (region) regionCounts[region] += 1;
     });

     const mappedGeoTotal = Object.values(regionCounts).reduce((sum, n) => sum + n, 0);
     if (mappedGeoTotal === 0) {
          const fallback = {
               'North America': 36,
               Europe: 28,
               'Asia Pacific': 22,
               'South America': 10,
               Others: 5,
          };

          return {
               cards: {
                    totalUsers: {
                         value: totalUsers,
                         displayValue: totalUsers.toLocaleString('en-US'),
                         growthPercent: Number(userGrowth.toFixed(1)),
                         growthLabel: formatGrowthLabel(userGrowth),
                    },
                    regularUsers: {
                         value: regularUsers,
                         displayValue: regularUsers.toLocaleString('en-US'),
                         growthPercent: Number(regularUserGrowth.toFixed(1)),
                         growthLabel: formatGrowthLabel(regularUserGrowth),
                    },
                    platformEarnings: {
                         value: Math.round(totalEarnings),
                         displayValue: formatCurrency(totalEarnings),
                         growthPercent: Number(earningsGrowth.toFixed(1)),
                         growthLabel: formatGrowthLabel(earningsGrowth),
                    },
                    liveNow: {
                         value: liveNow,
                         displayValue: liveNow.toLocaleString('en-US'),
                         peak24h,
                         subtitle: `Peak ${peak24h} today`,
                    },
               },
               charts: {
                    userOverview: {
                         year,
                         labels: MONTH_LABELS,
                         series: [{ name: 'Users', data: monthlyUsers }],
                    },
                    earningOverview: {
                         year,
                         labels: MONTH_LABELS,
                         series: [{ name: 'Earnings', data: monthlyEarnings }],
                    },
                    dailyActivityPattern: {
                         labels: activityLabels,
                         series: [
                              { name: 'Stream', data: streamsSeries },
                              { name: 'Users', data: usersSeries },
                         ],
                    },
                    geographicDistribution: {
                         title: 'Users by region',
                         items: Object.entries(fallback).map(([region, percentage]) => ({
                              region,
                              percentage,
                              users: Math.round((totalUsers * percentage) / 100),
                         })),
                    },
               },
          };
     }

     const geoItems = Object.entries(regionCounts).map(([region, count]) => {
          const percentage = mappedGeoTotal > 0 ? Math.round((count / mappedGeoTotal) * 100) : 0;
          return {
               region,
               percentage,
               users: count,
          };
     });

     return {
          cards: {
               totalUsers: {
                    value: totalUsers,
                    displayValue: totalUsers.toLocaleString('en-US'),
                    growthPercent: Number(userGrowth.toFixed(1)),
                    growthLabel: formatGrowthLabel(userGrowth),
               },
               regularUsers: {
                    value: regularUsers,
                    displayValue: regularUsers.toLocaleString('en-US'),
                    growthPercent: Number(regularUserGrowth.toFixed(1)),
                    growthLabel: formatGrowthLabel(regularUserGrowth),
               },
               platformEarnings: {
                    value: Math.round(totalEarnings),
                    displayValue: formatCurrency(totalEarnings),
                    growthPercent: Number(earningsGrowth.toFixed(1)),
                    growthLabel: formatGrowthLabel(earningsGrowth),
               },
               liveNow: {
                    value: liveNow,
                    displayValue: liveNow.toLocaleString('en-US'),
                    peak24h,
                    subtitle: `Peak ${peak24h} today`,
               },
          },
          charts: {
               userOverview: {
                    year,
                    labels: MONTH_LABELS,
                    series: [{ name: 'Users', data: monthlyUsers }],
               },
               earningOverview: {
                    year,
                    labels: MONTH_LABELS,
                    series: [{ name: 'Earnings', data: monthlyEarnings }],
               },
               dailyActivityPattern: {
                    labels: activityLabels,
                    series: [
                         { name: 'Stream', data: streamsSeries },
                         { name: 'Users', data: usersSeries },
                    ],
               },
               geographicDistribution: {
                    title: 'Users by region',
                    items: geoItems,
               },
          },
     };
};

const getAdminEarnings = async (query: Record<string, string>) => {
     const page = Math.max(parseInt(query.page || '1', 10), 1);
     const limit = Math.max(parseInt(query.limit || '10', 10), 1);
     const skip = (page - 1) * limit;
     const search = String(query.search || '').trim().toLowerCase();

     const txns: any[] = await WalletTransaction.find({
          type: { $in: ['platform_commission', 'subscription_commission'] },
          status: 'completed',
     })
          .sort({ createdAt: -1 })
          .lean();

     const userIds = Array.from(
          new Set(
               txns
                    .map((txn: any) => String(txn?.metadata?.streamerId || txn?.streamerId || ''))
                    .filter(Boolean),
          ),
     );

     const users = await User.find({ _id: { $in: userIds } })
          .select('_id name userName')
          .lean();
     const userMap = new Map(users.map((u: any) => [String(u._id), u]));

     const sourceLabelMap: Record<string, string> = {
          subscription: 'Streamer',
          gift: 'Streamer',
          marketplace: 'Business',
          other: 'Other',
     };

     const defaultCommissionMap: Record<string, number> = {
          subscription: 33,
          gift: 15,
          marketplace: 5,
          other: 0,
     };

     const rows = txns.map((txn: any, index: number) => {
          const sourceKey = String(txn?.metadata?.source || 'other').toLowerCase();
          const sourceType = sourceLabelMap[sourceKey] || 'Other';
          const commissionPercentage = Number(
               txn?.metadata?.commissionPercentage ?? defaultCommissionMap[sourceKey] ?? 0,
          );

          const adminShare = Number(txn.amount || 0);
          const grossValue = Number(
               txn?.metadata?.totalAmount ??
                    (commissionPercentage > 0 ? adminShare / (commissionPercentage / 100) : adminShare),
          );

          const userId = String(txn?.metadata?.streamerId || txn?.streamerId || '');
          const user = userMap.get(userId);
          const userName = user?.name || user?.userName || 'Unknown';

          const notes =
               String(txn?.description || '').trim() ||
               (sourceType === 'Business'
                    ? "Admin's fee from all business sales"
                    : "Admin's cut from all streamer earnings");

          const date = new Intl.DateTimeFormat('en-GB', {
               day: '2-digit',
               month: 'short',
               year: 'numeric',
          }).format(new Date(txn.createdAt));

          const serial = String(skip + index + 1).padStart(4, '0');

          return {
               id: serial,
               sourceType,
               userName,
               totalValue: `$${Math.round(grossValue).toLocaleString('en-US')}`,
               commissionPercentage: `${commissionPercentage}%`,
               adminShare: `$${Math.round(adminShare).toLocaleString('en-US')} (${commissionPercentage}%)`,
               notes,
               date,
          };
     });

     const filteredRows = search
          ? rows.filter((row: any) => {
                 const haystack = [
                      row.id,
                      row.sourceType,
                      row.userName,
                      row.totalValue,
                      row.commissionPercentage,
                      row.adminShare,
                      row.notes,
                      row.date,
                 ]
                      .join(' ')
                      .toLowerCase();
                 return haystack.includes(search);
            })
          : rows;

     const paginatedRows = filteredRows.slice(skip, skip + limit);

     return {
          rows: paginatedRows,
          pagination: {
               page,
               limit,
               total: filteredRows.length,
               totalPages: Math.ceil(filteredRows.length / limit),
          },
     };
};

const getTopPerformers = async (query: Record<string, string>) => {
     const page = Math.max(parseInt(query.page || '1', 10), 1);
     const limit = Math.max(parseInt(query.limit || '10', 10), 1);
     const skip = (page - 1) * limit;

     const filter: Record<string, unknown> = {
          status: { $in: ['live', 'ended'] },
     };

     if (query.streamerId) {
          filter.streamer = query.streamerId;
     }

     if (query.fromDate || query.toDate) {
          const createdAt: Record<string, Date> = {};
          if (query.fromDate) {
               createdAt.$gte = new Date(query.fromDate);
          }
          if (query.toDate) {
               createdAt.$lte = new Date(query.toDate);
          }
          filter.createdAt = createdAt;
     }

     const [streams, total] = await Promise.all([
          Stream.find(filter)
               .populate('streamer', 'name userName image')
               .populate('category', 'name title')
               .populate('analytics')
               .sort({ peakViewerCount: -1, likes: -1, createdAt: -1 })
               .skip(skip)
               .limit(limit),
          Stream.countDocuments(filter),
     ]);

     const rows = await Promise.all(
          streams.map(async (stream: any, index: number) => {
               const [giftSummary, activeSubscribers] = await Promise.all([
                    GiftTransaction.aggregate([
                         {
                              $match: {
                                   stream: stream._id,
                                   status: 'completed',
                              },
                         },
                         {
                              $group: {
                                   _id: '$stream',
                                   giftEarned: {
                                        $sum: {
                                             $ifNull: ['$metadata.usdValue', '$totalAmount'],
                                        },
                                   },
                              },
                         },
                    ]),
                    Subscription.countDocuments({
                         streamerId: stream.streamer?._id,
                         status: 'active',
                    }),
               ]);

               const analytics: any = stream.analytics || {};
               const categoryName = stream.category?.name || stream.category?.title || 'N/A';
               const giftEarned =
                    typeof analytics.revenue === 'number' && analytics.revenue > 0
                         ? analytics.revenue
                         : giftSummary[0]?.giftEarned || 0;

               const rawRank = skip + index + 1;
               const rawPeakViewers = analytics.peakViewers || stream.peakViewerCount || 0;
               const rawSubscriberGained =
                    typeof analytics.newSubscribers === 'number'
                         ? analytics.newSubscribers
                         : activeSubscribers;
               const rawDate: Date = stream.endedAt || stream.createdAt;
               const formattedDate = rawDate
                    ? new Intl.DateTimeFormat('en-GB', {
                           day: '2-digit',
                           month: 'short',
                           year: 'numeric',
                      }).format(new Date(rawDate))
                    : 'N/A';

               return {
                    rank: String(rawRank).padStart(2, '0'),
                    _id: stream._id,
                    streamerId: stream.streamer?._id,
                    streamerName: stream.streamer?.name || stream.streamer?.userName || 'Unknown',
                    streamId: stream._id,
                    streamTitle: stream.title,
                    category: categoryName,
                    peakLiveViewers: rawPeakViewers.toLocaleString('en-US'),
                    giftEarned: `$${giftEarned.toLocaleString('en-US')}`,
                    subscriberGained: rawSubscriberGained,
                    date: formattedDate,
               };
          }),
     );

     const summary = rows.reduce(
          (acc, row) => {
               acc.totalGiftEarned += parseFloat(String(row.giftEarned).replace(/[^0-9.]/g, '')) || 0;
               acc.totalSubscribersGained += Number(row.subscriberGained) || 0;
               acc.totalPeakLiveViewers += parseInt(String(row.peakLiveViewers).replace(/,/g, ''), 10) || 0;
               return acc;
          },
          {
               totalGiftEarned: 0,
               totalSubscribersGained: 0,
               totalPeakLiveViewers: 0,
          },
     );

     return {
          rows,
          summary: {
               totalStreamsAnalyzed: rows.length,
               totalGiftEarned: summary.totalGiftEarned,
               totalSubscribersGained: summary.totalSubscribersGained,
               avgPeakLiveViewers:
                    rows.length > 0
                         ? Math.round(summary.totalPeakLiveViewers / rows.length)
                         : 0,
          },
          pagination: {
               page,
               limit,
               total,
               totalPages: Math.ceil(total / limit),
          },
     };
};

/**
 * ==================== ADMIN PAYOUT MANAGEMENT ====================
 */

const requestAdminPayout = async (adminUserId: string, payload: {
     amount: number;
     payoutMethod: 'bank_transfer' | 'stripe' | 'paypal';
     bankDetails?: Record<string, any>;
     stripeDetails?: Record<string, any>;
     paypalDetails?: Record<string, any>;
}) => {
     try {
          // Get admin wallet
          const wallet = await Wallet.findOne({ userId: adminUserId });
          if (!wallet) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Admin wallet not found');
          }

          if (wallet.cashBalance < payload.amount) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Insufficient cash balance for payout');
          }

          if (payload.amount < 20) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Minimum payout amount is $20');
          }

          const payoutDetails = payload.bankDetails || payload.stripeDetails || payload.paypalDetails;
          if (!payoutDetails) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Payout details are required');
          }

          // Direct withdrawal for single-admin setup
          wallet.cashBalance -= payload.amount;
          wallet.totalCashWithdrawn += payload.amount;
          wallet.balance = wallet.cashBalance;
          wallet.totalWithdrawn = wallet.totalCashWithdrawn;
          await wallet.save();

          const transactionId = `payout_${Date.now()}`;

          // Create payout audit row as already-paid
          const payoutRequest = await AdminPayout.create({
               adminUserId,
               amount: payload.amount,
               payoutMethod: payload.payoutMethod,
               bankDetails: payload.bankDetails,
               stripeDetails: payload.stripeDetails,
               paypalDetails: payload.paypalDetails,
               payoutDetails,
               status: 'paid',
               requestedAt: new Date(),
               approvedAt: new Date(),
               paidAt: new Date(),
               transactionId,
          });

          await WalletTransaction.create({
               userId: adminUserId,
               type: 'withdrawal',
               amount: -payload.amount,
               description: `Admin direct payout via ${payload.payoutMethod} ($${payload.amount})`,
               status: 'completed',
               transactionId,
               metadata: {
                    payoutMethod: payload.payoutMethod,
                    payoutId: payoutRequest._id,
                    payoutDetails,
               },
          });

          logger.info(`✓ Direct admin payout completed: ${adminUserId} ($${payload.amount}) via ${payload.payoutMethod}`);

          return {
               message: 'Payout completed successfully',
               payoutId: payoutRequest._id,
               amount: payload.amount,
               payoutMethod: payload.payoutMethod,
               status: 'paid',
               transactionId,
          };
     } catch (error) {
          errorLogger.error('Request admin payout error', error);
          throw error;
     }
};

const getAdminPayoutRequests = async (query: Record<string, any>) => {
     try {
          const page = Number(query.page) || 1;
          const limit = Number(query.limit) || 20;
          const status = query.status || 'all';
          const search = query.search || '';

          const skip = (page - 1) * limit;

          // Build filter
          const filter: any = {};
          if (status !== 'all') {
               filter.status = status;
          }

          // Create search filter for admin name or ID
          let searchQuery: any = filter;
          if (search) {
               const adminUsers = await User.find({
                    $or: [
                         { name: { $regex: search, $options: 'i' } },
                         { email: { $regex: search, $options: 'i' } },
                    ],
               }).select('_id');

               const adminIds = adminUsers.map(u => u._id);
               searchQuery = {
                    ...filter,
                    adminUserId: { $in: adminIds },
               };
          }

          // Fetch payout requests with pagination
          const [payouts, total] = await Promise.all([
               AdminPayout.find(searchQuery)
                    .populate('adminUserId', 'name email')
                    .populate('approvedBy', 'name email')
                    .sort({ requestedAt: -1 })
                    .skip(skip)
                    .limit(limit),
               AdminPayout.countDocuments(searchQuery),
          ]);

          return {
               rows: payouts.map((payout: any) => ({
                    id: payout._id,
                    adminName: payout.adminUserId?.name,
                    adminEmail: payout.adminUserId?.email,
                    amount: payout.amount,
                    payoutMethod: payout.payoutMethod,
                    status: payout.status,
                    requestedAt: payout.requestedAt,
                    approvedAt: payout.approvedAt,
                    approvedBy: payout.approvedBy?.name,
                    paidAt: payout.paidAt,
                    rejectionReason: payout.rejectionReason,
               })),
               pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
               },
          };
     } catch (error) {
          errorLogger.error('Get admin payout requests error', error);
          throw error;
     }
};

const getStreamersData = async (query: Record<string, string>) => {
     try {
          const page = Math.max(parseInt(query.page || '1', 10), 1);
          const limit = Math.max(parseInt(query.limit || '10', 10), 1);
          const skip = (page - 1) * limit;

          // Fetch all streamers (users with role USER)
          const [streamers, total] = await Promise.all([
               User.find({ role: 'USER', isDeleted: { $ne: true } })
                    .select('_id name userName image followers following friends createdAt')
                    .skip(skip)
                    .limit(limit)
                    .lean(),
               User.countDocuments({ role: 'USER', isDeleted: { $ne: true } }),
          ]);

          // Fetch detailed data for each streamer
          const streamersData = await Promise.all(
               streamers.map(async (user: any) => {
                    // Fetch streams first to use in warning count
                    const userStreams = await Stream.find({ streamer: user._id }).lean();
                    const streamIds = userStreams.map((s: any) => s._id);

                    const [
                         wallet,
                         warnings,
                         subscribers,
                         lastStream,
                         avgViewers,
                         totalEarnings,
                    ] = await Promise.all([
                         Wallet.findOne({ userId: user._id }).lean(),
                         StreamWarning.countDocuments({
                              stream: { $in: streamIds },
                              status: 'active',
                         }),
                         Subscription.countDocuments({
                              streamerId: user._id,
                              status: 'active',
                         }),
                         Stream.findOne({ streamer: user._id })
                              .sort({ createdAt: -1 })
                              .select('createdAt')
                              .lean(),
                         Stream.aggregate([
                              { $match: { streamer: user._id } },
                              { $group: { _id: null, avg: { $avg: '$currentViewerCount' } } },
                         ]),
                         GiftTransaction.aggregate([
                              { $match: { status: 'completed' } },
                              {
                                   $group: {
                                        _id: null,
                                        total: {
                                             $sum: {
                                                  $ifNull: ['$metadata.usdValue', '$totalAmount'],
                                             },
                                        },
                                   },
                              },
                         ]),
                    ]);

                    const featherLevel = wallet ? Math.ceil(wallet.totalFeathersEarned / 1000) || 0 : 0;
                    const totalCoins = wallet?.totalCashEarned || 0;
                    const totalEarned = wallet?.totalCashEarned || 0;
                    const avgViews = Math.round(avgViewers[0]?.avg || 0);
                    const lastStreamDate = lastStream?.createdAt
                         ? new Intl.DateTimeFormat('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                           }).format(new Date(lastStream.createdAt))
                         : 'Never';

                    return {
                         id: user._id,
                         name: user.name,
                         location: 'New York, USA', // Placeholder since location field not in User model
                         featherLevel: featherLevel,
                         avgViewers: avgViews,
                         totalFeather: wallet?.totalFeathersEarned || 0,
                         totalCoins: Math.round(totalCoins),
                         flagged: warnings || 0,
                         followers: user.followers?.length || 0,
                         following: user.following?.length || 0,
                         friends: user.friends?.length || 0,
                         subscribers: subscribers,
                         totalEarnings: `$${Math.round(totalEarned).toLocaleString('en-US')}`,
                         lastStream: lastStreamDate,
                    };
               }),
          );

          return {
               rows: streamersData,
               pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
               },
          };
     } catch (error) {
          errorLogger.error('Get streamers data error', error);
          throw error;
     }
};

const getUserDetails = async (userId: string) => {
     try {
          const user = await User.findById(userId)
               .select('_id name userName email image bio followers following friends createdAt updatedAt')
               .lean() as any;

          if (!user) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
          }

          const [wallet, subscriber] = await Promise.all([
               Wallet.findOne({ userId: user._id }).lean(),
               Subscription.findOne({ streamerId: user._id, status: 'active' }).lean(),
          ]);

          return {
               id: user._id,
               name: user.name,
               userName: user.userName,
               email: user.email,
               image: user.image || '',
               bio: user.bio || '',
               location: 'New York, USA', // Placeholder - location field not in User model
               followers: user.followers?.length || 0,
               following: user.following?.length || 0,
               friends: user.friends?.length || 0,
               totalFeathersEarned: wallet?.totalFeathersEarned || 0,
               totalCashEarned: wallet?.totalCashEarned || 0,
               createdAt: user.createdAt,
          };
     } catch (error) {
          errorLogger.error('Get user details error', error);
          throw error;
     }
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
     getActiveStreams,
     getSingleActiveStream,
     getStreamMonitoring,
     getSingleStreamMonitoring,
     warnStreamer,
     endStream,
     getStreamerWarnings,
     getDashboardOverview,
     getAdminEarnings,
     getTopPerformers,
     getStreamersData,
     getUserDetails,
     requestAdminPayout,
     getAdminPayoutRequests,
};
