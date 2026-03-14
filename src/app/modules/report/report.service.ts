import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError.js';
import { Report } from './report.model.js';
import { ReportReason, ReportType } from './report.interface.js';

const createReport = async (
  reporterId: string,
  reportType: ReportType,
  targetId: string,
  payload: { reason: ReportReason; details?: string },
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

  const report = await Report.create({
    reporter: reporterId,
    reportType,
    targetId,
    reason: payload.reason,
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
