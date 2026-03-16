import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import { ReportService } from './report.service.js';

const reportStream = catchAsync(async (req: Request, res: Response) => {
  const reporterId = (req.user as any).id;
  const { streamId } = req.params;
  const result = await ReportService.createReport(reporterId, 'stream', streamId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Stream reported successfully',
    data: result,
  });
});

const reportProfile = catchAsync(async (req: Request, res: Response) => {
  const reporterId = (req.user as any).id;
  const { userId } = req.params;
  const result = await ReportService.createReport(reporterId, 'profile', userId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Profile reported successfully',
    data: result,
  });
});

const reportPost = catchAsync(async (req: Request, res: Response) => {
  const reporterId = (req.user as any).id;
  const { postId } = req.params;
  const result = await ReportService.createReport(reporterId, 'post', postId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Post reported successfully',
    data: result,
  });
});

const getAllReports = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getAllReports(req.query as Record<string, string>);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Reports retrieved successfully',
    data: result,
  });
});

const getStreamReports = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getStreamReportsForAdmin(
    req.query as Record<string, string>,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Stream reports retrieved successfully',
    data: result,
  });
});

const getProfileReports = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getProfileReportsForAdmin(
    req.query as Record<string, string>,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Profile reports retrieved successfully',
    data: result,
  });
});

const getPostReports = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getPostReportsForAdmin(
    req.query as Record<string, string>,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Post reports retrieved successfully',
    data: result,
  });
});

const getReportById = catchAsync(async (req: Request, res: Response) => {
  const { reportId } = req.params;
  const result = await ReportService.getReportById(reportId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Report retrieved successfully',
    data: result,
  });
});

const updateReportStatus = catchAsync(async (req: Request, res: Response) => {
  const adminId = (req.user as any).id;
  const { reportId } = req.params;
  const { status } = req.body;
  const result = await ReportService.updateReportStatus(reportId, adminId, status);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Report status updated successfully',
    data: result,
  });
});

export const ReportController = {
  reportStream,
  reportProfile,
  reportPost,
  getAllReports,
  getStreamReports,
  getProfileReports,
  getPostReports,
  getReportById,
  updateReportStatus,
};
