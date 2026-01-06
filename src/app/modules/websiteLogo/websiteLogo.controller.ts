import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { WebsiteLogoService } from './websiteLogo.service';

const createOrUpdateLogo = catchAsync(async (req: Request, res: Response) => {
     const { status } = req.body;
     const result = await WebsiteLogoService.createOrUpdateLogoToDB(req.files, status);
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Logo uploaded/updated successfully',
          data: result,
     });
});

const getLogo = catchAsync(async (req: Request, res: Response) => {
     const result = await WebsiteLogoService.getLogoFromDB();
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Logo fetched successfully',
          data: result,
     });
});

export const WebsiteLogoController = {
     createOrUpdateLogo,
     getLogo,
};
