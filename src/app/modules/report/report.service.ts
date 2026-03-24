import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError.js';
import { Report } from './report.model.js';
import { ReportReason, ReportType } from './report.interface.js';
import { Stream } from '../stream/stream.model.js';
import { User } from '../user/user.model.js';
import { Moment } from '../moment/moment.model.js';

const REPORT_REASON_LABEL_TO_KEY: Record<string, ReportReason> = {
  inappropriate_or_offensive_content: 'inappropriate_content',
  inappropriate_content: 'inappropriate_content',
  harassment_or_hate_speech: 'harassment',
  harassment: 'harassment',
  nudity_or_sexual_content: 'nudity',
  nudity: 'nudity',
  violence_or_harmful_behavior: 'violence',
  violence: 'violence',
  spam_or_misleading_stream_title_content: 'spam',
  spam_or_misleading_content: 'spam',
  spam: 'spam',
  impersonation_or_fake_identity: 'impersonation',
  impersonation: 'impersonation',
  illegal_or_restricted_activity_drugs_weapons_etc: 'illegal_activity',
  illegal_or_restricted_activity: 'illegal_activity',
  illegal_activity: 'illegal_activity',
};

const normalizeReasonInput = (reason: string): ReportReason => {
  const normalized = reason
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const mapped = REPORT_REASON_LABEL_TO_KEY[normalized];
  if (!mapped) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Invalid reason. Use a valid report reason option from the app.',
    );
  }

  return mapped;
};

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const formatResolutionHours = (hours: number) => {
  if (!hours || hours <= 0) return '0 hrs';
  if (hours < 1) return `${Math.round(hours * 60)} mins`;
  return `${Number(hours.toFixed(1))} hrs`;
};

const getDashboardStats = async () => {
  const [typeRows, statusRows, avgRows] = await Promise.all([
    Report.aggregate([{ $group: { _id: '$reportType', count: { $sum: 1 } } }]),
    Report.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Report.aggregate([
      { $match: { reviewedAt: { $ne: null } } },
      {
        $project: {
          resolutionMs: { $subtract: ['$reviewedAt', '$createdAt'] },
        },
      },
      {
        $group: {
          _id: null,
          avgResolutionMs: { $avg: '$resolutionMs' },
        },
      },
    ]),
  ]);

  const typeCounts = { stream: 0, profile: 0, post: 0 };
  for (const row of typeRows) {
    if (row._id in typeCounts) {
      typeCounts[row._id as keyof typeof typeCounts] = row.count;
    }
  }

  const statusCounts = { pending: 0, reviewed: 0, resolved: 0, dismissed: 0 };
  for (const row of statusRows) {
    if (row._id in statusCounts) {
      statusCounts[row._id as keyof typeof statusCounts] = row.count;
    }
  }

  const totalReports = Object.values(typeCounts).reduce((acc, value) => acc + value, 0);
  const avgResolutionHours = (avgRows[0]?.avgResolutionMs || 0) / (1000 * 60 * 60);

  return {
    cards: {
      liveStreamReports: typeCounts.stream,
      streamerFansReports: typeCounts.profile,
      momentsReport: typeCounts.post,
      avgResolutionTimeHours: Number(avgResolutionHours.toFixed(2)),
      avgResolutionTimeLabel: formatResolutionHours(avgResolutionHours),
    },
    statusSummary: {
      pendingReports: statusCounts.pending,
      resolvedReports: statusCounts.resolved,
      totalReports,
      reviewedReports: statusCounts.reviewed,
      dismissedReports: statusCounts.dismissed,
    },
    typeSummary: typeCounts,
  };
};

const enrichReportsByType = async (reports: any[], reportType: ReportType) => {
  const targetIds = reports.map((report) => report.targetId?.toString()).filter(Boolean);
  const uniqueTargetIds = [...new Set(targetIds)];

  const targetMap = new Map<string, any>();

  if (uniqueTargetIds.length) {
    if (reportType === 'stream') {
      const streams = await Stream.find({ _id: { $in: uniqueTargetIds } })
        .populate('streamer', 'name userName image')
        .select('_id title streamer status createdAt')
        .lean();

      streams.forEach((stream: any) => targetMap.set(stream._id.toString(), stream));
    }

    if (reportType === 'profile') {
      const users = await User.find({ _id: { $in: uniqueTargetIds } })
        .select('_id name userName email image role verified')
        .lean();

      users.forEach((user: any) => targetMap.set(user._id.toString(), user));
    }

    if (reportType === 'post') {
      const posts = await Moment.find({ _id: { $in: uniqueTargetIds } })
        .populate('author', 'name userName image')
        .select('_id description media author createdAt')
        .lean();

      posts.forEach((post: any) => targetMap.set(post._id.toString(), post));
    }
  }

  return reports.map((report: any) => {
    const target = targetMap.get(report.targetId.toString()) || null;
    const reporter = report.reporter || null;
    const reviewedBy = report.reviewedBy || null;

    const base = {
      id: report._id,
      reportId: report._id,
      reportCode: report._id.toString().slice(-6).toUpperCase(),
      reportType: report.reportType,
      reportReason: report.reason,
      details: report.details || null,
      status: report.status,
      createdAt: report.createdAt,
      date: report.createdAt,
      reportedBy: reporter
        ? {
            id: reporter._id,
            name: reporter.name,
            userName: reporter.userName,
            image: reporter.image,
          }
        : null,
      reviewedBy: reviewedBy
        ? {
            id: reviewedBy._id,
            name: reviewedBy.name,
            userName: reviewedBy.userName,
          }
        : null,
      reviewedAt: report.reviewedAt || null,
      targetId: report.targetId,
      targetExists: Boolean(target),
    };

    if (reportType === 'stream') {
      return {
        ...base,
        streamTitle: target?.title || null,
        streamerName: target?.streamer?.name || target?.streamer?.userName || null,
        target,
      };
    }

    if (reportType === 'profile') {
      return {
        ...base,
        profileName: target?.name || null,
        profileUserName: target?.userName || null,
        target,
      };
    }

    return {
      ...base,
      postDescription: target?.description || null,
      postAuthorName: target?.author?.name || target?.author?.userName || null,
      target,
    };
  });
};

const getReportsByTypeForAdmin = async (
  reportType: ReportType,
  query: Record<string, string>,
) => {
  const filter: Record<string, unknown> = { reportType };

  if (query.status) filter.status = query.status;
  if (query.reason) filter.reason = query.reason;

  const page = toPositiveInt(query.page, 1);
  const limit = toPositiveInt(query.limit, 20);
  const skip = (page - 1) * limit;
  const search = String(query.search || '').trim().toLowerCase();

  const [reports, dashboard] = await Promise.all([
    Report.find(filter)
      .populate('reporter', 'name userName image email')
      .populate('reviewedBy', 'name userName email')
      .sort({ createdAt: -1 })
      .lean(),
    getDashboardStats(),
  ]);

  const rows = await enrichReportsByType(reports as any[], reportType);

  const filteredRows = search
    ? rows.filter((row: any) => {
        const haystack = [
          row.reportCode,
          row.reportReason,
          row.status,
          row.streamTitle,
          row.streamerName,
          row.profileName,
          row.profileUserName,
          row.postDescription,
          row.postAuthorName,
          row.reportedBy?.name,
          row.reportedBy?.userName,
          row.date ? new Date(row.date).toISOString() : null,
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase())
          .join(' ');

        return haystack.includes(search);
      })
    : rows;

  const total = filteredRows.length;
  const paginatedRows = filteredRows.slice(skip, skip + limit);

  return {
    reportType,
    dashboard,
    reports: paginatedRows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const createReport = async (
  reporterId: string,
  reportType: ReportType,
  targetId: string,
  payload: { reason: string; details?: string },
) => {
  // Prevent self-reporting a profile
  if (reportType === 'profile' && targetId === reporterId) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'You cannot report your own profile');
  }

  // Prevent duplicate reports
  const existing = await Report.findOne({
    reporter: reporterId,
    reportType,
    targetId,
  });
  if (existing) {
    throw new AppError(StatusCodes.CONFLICT, 'You have already reported this');
  }

  const normalizedReason = normalizeReasonInput(payload.reason);

  const report = await Report.create({
    reporter: reporterId,
    reportType,
    targetId,
    reason: normalizedReason,
    details: payload.details,
  });

  return report;
};

const getAllReports = async (query: Record<string, string>) => {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.reportType) filter.reportType = query.reportType;

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .populate('reporter', 'name userName email image')
      .populate('reviewedBy', 'name userName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Report.countDocuments(filter),
  ]);

  return {
    reports,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getReportById = async (reportId: string) => {
  const report = await Report.findById(reportId)
    .populate('reporter', 'name userName email image')
    .populate('reviewedBy', 'name userName email')
    .lean();

  if (!report) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Report not found');
  }
  return report;
};

const updateReportStatus = async (
  reportId: string,
  adminId: string,
  status: 'reviewed' | 'resolved' | 'dismissed',
) => {
  const report = await Report.findByIdAndUpdate(
    reportId,
    { status, reviewedBy: adminId, reviewedAt: new Date() },
    { new: true },
  )
    .populate('reporter', 'name userName email image')
    .populate('reviewedBy', 'name userName email');

  if (!report) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Report not found');
  }
  return report;
};

const getStreamReportsForAdmin = async (query: Record<string, string>) => {
  return getReportsByTypeForAdmin('stream', query);
};

const getProfileReportsForAdmin = async (query: Record<string, string>) => {
  return getReportsByTypeForAdmin('profile', query);
};

const getPostReportsForAdmin = async (query: Record<string, string>) => {
  return getReportsByTypeForAdmin('post', query);
};

export const ReportService = {
  createReport,
  getAllReports,
  getReportById,
  updateReportStatus,
  getStreamReportsForAdmin,
  getProfileReportsForAdmin,
  getPostReportsForAdmin,
};
