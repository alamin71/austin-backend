import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError.js';
import { Report } from './report.model.js';
import { ReportReason, ReportType } from './report.interface.js';

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

export const ReportService = {
  createReport,
  getAllReports,
  getReportById,
  updateReportStatus,
};
