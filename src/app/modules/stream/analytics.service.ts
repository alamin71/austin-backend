import { Stream } from './stream.model.js';
import { StreamAnalytics } from './streamAnalytics.model.js';
import { GiftTransaction } from '../gift/gift.model.js';
import { User } from '../user/user.model.js';
import AppError from '../../../errors/AppError.js';
import { StatusCodes } from 'http-status-codes';

class AnalyticsService {
     /**
      * Get overall platform analytics (Admin)
      */
     static async getPlatformAnalytics(dateRange?: { startDate: Date; endDate: Date }) {
          const filter: any = {};
          if (dateRange) {
               filter.createdAt = {
                    $gte: dateRange.startDate,
                    $lte: dateRange.endDate,
               };
          }

          // Total streams count
          const totalStreams = await Stream.countDocuments(filter);
          const liveStreams = await Stream.countDocuments({ ...filter, status: 'live' });
          const endedStreams = await Stream.countDocuments({ ...filter, status: 'ended' });

          // Total streamers
          const totalStreamers = await Stream.distinct('streamer', filter);

          // Total viewers (unique)
          const streamsWithViewers = await Stream.find(filter).select('viewers');
          const uniqueViewers = new Set();
          streamsWithViewers.forEach((stream) => {
               stream.viewers.forEach((viewer) => uniqueViewers.add(viewer.toString()));
          });

          // Total watch time
          const watchTimeResult = await Stream.aggregate([
               { $match: filter },
               {
                    $group: {
                         _id: null,
                         totalDuration: { $sum: '$duration' },
                         avgDuration: { $avg: '$duration' },
                         totalViewers: { $sum: '$currentViewerCount' },
                         totalPeakViewers: { $sum: '$peakViewerCount' },
                    },
               },
          ]);

          // Revenue analytics
          const revenueResult = await StreamAnalytics.aggregate([
               { $match: filter },
               {
                    $group: {
                         _id: null,
                         totalRevenue: { $sum: '$revenue' },
                         totalGifts: { $sum: '$giftsReceived' },
                    },
               },
          ]);

          // Top categories
          const topCategories = await Stream.aggregate([
               { $match: { ...filter, status: 'ended' } },
               {
                    $group: {
                         _id: '$category',
                         count: { $sum: 1 },
                         totalViewers: { $sum: '$currentViewerCount' },
                    },
               },
               { $sort: { count: -1 } },
               { $limit: 10 },
               {
                    $lookup: {
                         from: 'categories',
                         localField: '_id',
                         foreignField: '_id',
                         as: 'categoryInfo',
                    },
               },
               { $unwind: '$categoryInfo' },
               {
                    $project: {
                         category: '$categoryInfo.title',
                         streamCount: '$count',
                         totalViewers: 1,
                    },
               },
          ]);

          // Top streamers
          const topStreamers = await Stream.aggregate([
               { $match: { ...filter, status: 'ended' } },
               {
                    $group: {
                         _id: '$streamer',
                         streamCount: { $sum: 1 },
                         totalViewers: { $sum: '$currentViewerCount' },
                         avgViewers: { $avg: '$currentViewerCount' },
                    },
               },
               { $sort: { totalViewers: -1 } },
               { $limit: 10 },
               {
                    $lookup: {
                         from: 'users',
                         localField: '_id',
                         foreignField: '_id',
                         as: 'streamerInfo',
                    },
               },
               { $unwind: '$streamerInfo' },
               {
                    $project: {
                         streamer: {
                              _id: '$streamerInfo._id',
                              name: '$streamerInfo.name',
                              avatar: '$streamerInfo.image.profile_image',
                         },
                         streamCount: 1,
                         totalViewers: 1,
                         avgViewers: { $round: ['$avgViewers', 0] },
                    },
               },
          ]);

          return {
               overview: {
                    totalStreams,
                    liveStreams,
                    endedStreams,
                    totalStreamers: totalStreamers.length,
                    totalUniqueViewers: uniqueViewers.size,
                    totalWatchTime: watchTimeResult[0]?.totalDuration || 0,
                    avgStreamDuration: watchTimeResult[0]?.avgDuration || 0,
                    totalRevenue: revenueResult[0]?.totalRevenue || 0,
                    totalGifts: revenueResult[0]?.totalGifts || 0,
               },
               topCategories,
               topStreamers,
          };
     }

     /**
      * Get streamer analytics dashboard
      */
     static async getStreamerDashboard(streamerId: string, dateRange?: { startDate: Date; endDate: Date }) {
          const filter: any = { streamer: streamerId };
          if (dateRange) {
               filter.createdAt = {
                    $gte: dateRange.startDate,
                    $lte: dateRange.endDate,
               };
          }

          // Overall stats
          const totalStreams = await Stream.countDocuments(filter);
          const liveStreams = await Stream.countDocuments({ ...filter, status: 'live' });

          // Performance metrics
          const performance = await Stream.aggregate([
               { $match: filter },
               {
                    $group: {
                         _id: null,
                         totalDuration: { $sum: '$duration' },
                         avgDuration: { $avg: '$duration' },
                         totalViewers: { $sum: '$currentViewerCount' },
                         avgViewers: { $avg: '$currentViewerCount' },
                         peakViewers: { $max: '$peakViewerCount' },
                         totalLikes: { $sum: '$likes' },
                    },
               },
          ]);

          // Revenue analytics
          const revenueStats = await StreamAnalytics.aggregate([
               {
                    $lookup: {
                         from: 'streams',
                         localField: 'stream',
                         foreignField: '_id',
                         as: 'streamInfo',
                    },
               },
               { $unwind: '$streamInfo' },
               { $match: { 'streamInfo.streamer': streamerId, ...filter } },
               {
                    $group: {
                         _id: null,
                         totalRevenue: { $sum: '$revenue' },
                         totalGifts: { $sum: '$giftsReceived' },
                         totalNewSubscribers: { $sum: '$newSubscribers' },
                         totalNewFollowers: { $sum: '$newFollowers' },
                         avgEngagement: { $avg: '$avgEngagementRate' },
                    },
               },
          ]);

          // Gifts breakdown
          const giftsBreakdown = await GiftTransaction.aggregate([
               {
                    $lookup: {
                         from: 'streams',
                         localField: 'stream',
                         foreignField: '_id',
                         as: 'streamInfo',
                    },
               },
               { $unwind: '$streamInfo' },
               { $match: { 'streamInfo.streamer': streamerId, receiver: streamerId } },
               {
                    $group: {
                         _id: '$gift',
                         count: { $sum: '$quantity' },
                         totalAmount: { $sum: '$totalAmount' },
                    },
               },
               { $sort: { totalAmount: -1 } },
               { $limit: 10 },
               {
                    $lookup: {
                         from: 'gifts',
                         localField: '_id',
                         foreignField: '_id',
                         as: 'giftInfo',
                    },
               },
               { $unwind: '$giftInfo' },
               {
                    $project: {
                         giftName: '$giftInfo.name',
                         giftImage: '$giftInfo.image',
                         count: 1,
                         totalAmount: 1,
                    },
               },
          ]);

          // Recent streams performance
          const recentStreams = await Stream.find(filter)
               .populate('category', 'title')
               .sort({ createdAt: -1 })
               .limit(10)
               .select('title status duration currentViewerCount peakViewerCount likes startedAt endedAt');

          // Growth over time (daily)
          const growthData = await Stream.aggregate([
               { $match: filter },
               {
                    $group: {
                         _id: {
                              year: { $year: '$createdAt' },
                              month: { $month: '$createdAt' },
                              day: { $dayOfMonth: '$createdAt' },
                         },
                         streamCount: { $sum: 1 },
                         totalViewers: { $sum: '$currentViewerCount' },
                         avgViewers: { $avg: '$currentViewerCount' },
                    },
               },
               { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
               { $limit: 30 },
          ]);

          return {
               overview: {
                    totalStreams,
                    liveStreams,
                    totalDuration: performance[0]?.totalDuration || 0,
                    avgDuration: performance[0]?.avgDuration || 0,
                    totalViewers: performance[0]?.totalViewers || 0,
                    avgViewers: performance[0]?.avgViewers || 0,
                    peakViewers: performance[0]?.peakViewers || 0,
                    totalLikes: performance[0]?.totalLikes || 0,
               },
               revenue: {
                    totalRevenue: revenueStats[0]?.totalRevenue || 0,
                    totalGifts: revenueStats[0]?.totalGifts || 0,
                    totalNewSubscribers: revenueStats[0]?.totalNewSubscribers || 0,
                    totalNewFollowers: revenueStats[0]?.totalNewFollowers || 0,
                    avgEngagement: revenueStats[0]?.avgEngagement || 0,
               },
               giftsBreakdown,
               recentStreams,
               growthData,
          };
     }

     /**
      * Get real-time analytics for active streams
      */
     static async getRealtimeAnalytics() {
          const liveStreams = await Stream.find({ status: 'live' })
               .populate('streamer', 'name image')
               .populate('category', 'title')
               .sort({ currentViewerCount: -1 })
               .select('title streamer category currentViewerCount peakViewerCount startedAt duration');

          const totalLiveViewers = liveStreams.reduce((sum, stream) => sum + stream.currentViewerCount, 0);

          return {
               liveStreamCount: liveStreams.length,
               totalLiveViewers,
               liveStreams,
          };
     }

     /**
      * Get category analytics
      */
     static async getCategoryAnalytics(categoryId: string, dateRange?: { startDate: Date; endDate: Date }) {
          const filter: any = { category: categoryId };
          if (dateRange) {
               filter.createdAt = {
                    $gte: dateRange.startDate,
                    $lte: dateRange.endDate,
               };
          }

          const stats = await Stream.aggregate([
               { $match: filter },
               {
                    $group: {
                         _id: null,
                         totalStreams: { $sum: 1 },
                         totalViewers: { $sum: '$currentViewerCount' },
                         avgViewers: { $avg: '$currentViewerCount' },
                         peakViewers: { $max: '$peakViewerCount' },
                         totalDuration: { $sum: '$duration' },
                    },
               },
          ]);

          const topStreamers = await Stream.aggregate([
               { $match: filter },
               {
                    $group: {
                         _id: '$streamer',
                         streamCount: { $sum: 1 },
                         totalViewers: { $sum: '$currentViewerCount' },
                    },
               },
               { $sort: { totalViewers: -1 } },
               { $limit: 5 },
               {
                    $lookup: {
                         from: 'users',
                         localField: '_id',
                         foreignField: '_id',
                         as: 'streamerInfo',
                    },
               },
               { $unwind: '$streamerInfo' },
          ]);

          return {
               stats: stats[0] || {},
               topStreamers,
          };
     }

     /**
      * Get comparison analytics (This month vs Last month)
      */
     static async getComparisonAnalytics(streamerId?: string) {
          const now = new Date();
          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

          const baseFilter: any = {};
          if (streamerId) {
               baseFilter.streamer = streamerId;
          }

          const thisMonthStats = await Stream.aggregate([
               { $match: { ...baseFilter, createdAt: { $gte: thisMonthStart } } },
               {
                    $group: {
                         _id: null,
                         streamCount: { $sum: 1 },
                         totalViewers: { $sum: '$currentViewerCount' },
                         avgViewers: { $avg: '$currentViewerCount' },
                    },
               },
          ]);

          const lastMonthStats = await Stream.aggregate([
               { $match: { ...baseFilter, createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
               {
                    $group: {
                         _id: null,
                         streamCount: { $sum: 1 },
                         totalViewers: { $sum: '$currentViewerCount' },
                         avgViewers: { $avg: '$currentViewerCount' },
                    },
               },
          ]);

          const thisMonth = thisMonthStats[0] || { streamCount: 0, totalViewers: 0, avgViewers: 0 };
          const lastMonth = lastMonthStats[0] || { streamCount: 0, totalViewers: 0, avgViewers: 0 };

          return {
               thisMonth,
               lastMonth,
               growth: {
                    streamCount: ((thisMonth.streamCount - lastMonth.streamCount) / (lastMonth.streamCount || 1)) * 100,
                    totalViewers:
                         ((thisMonth.totalViewers - lastMonth.totalViewers) / (lastMonth.totalViewers || 1)) * 100,
                    avgViewers: ((thisMonth.avgViewers - lastMonth.avgViewers) / (lastMonth.avgViewers || 1)) * 100,
               },
          };
     }
}

export default AnalyticsService;
