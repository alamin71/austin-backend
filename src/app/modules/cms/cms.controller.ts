import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import { TStaticContentKey } from './cms.interface.js';
import CmsService from './cms.service.js';

class CmsController {
     createFaq = catchAsync(async (req: Request, res: Response) => {
          const faq = await CmsService.createFaq(req.body);

          sendResponse(res, {
               statusCode: StatusCodes.CREATED,
               success: true,
               message: 'FAQ created successfully',
               data: faq,
          });
     });

     getAllFaqs = catchAsync(async (req: Request, res: Response) => {
          const faqs = await CmsService.getAllFaqs();

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'FAQs retrieved successfully',
               data: faqs,
          });
     });

     getFaqById = catchAsync(async (req: Request, res: Response) => {
          const faq = await CmsService.getFaqById(req.params.faqId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'FAQ retrieved successfully',
               data: faq,
          });
     });

     updateFaq = catchAsync(async (req: Request, res: Response) => {
          const faq = await CmsService.updateFaq(req.params.faqId, req.body);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'FAQ updated successfully',
               data: faq,
          });
     });

     deleteFaq = catchAsync(async (req: Request, res: Response) => {
          const faq = await CmsService.deleteFaq(req.params.faqId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'FAQ deleted successfully',
               data: faq,
          });
     });

     createStaticContent = catchAsync(async (req: Request, res: Response) => {
          const content = await CmsService.createStaticContent(req.body);

          sendResponse(res, {
               statusCode: StatusCodes.CREATED,
               success: true,
               message: 'Static content created successfully',
               data: content,
          });
     });

     getAllStaticContents = catchAsync(async (req: Request, res: Response) => {
          const contents = await CmsService.getAllStaticContents();

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Static contents retrieved successfully',
               data: contents,
          });
     });

     getStaticContentByKey = catchAsync(async (req: Request, res: Response) => {
          const content = await CmsService.getStaticContentByKey(req.params.key as TStaticContentKey);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Static content retrieved successfully',
               data: content,
          });
     });

     updateStaticContentByKey = catchAsync(async (req: Request, res: Response) => {
          const content = await CmsService.updateStaticContentByKey(req.params.key as TStaticContentKey, req.body);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Static content updated successfully',
               data: content,
          });
     });

     deleteStaticContentByKey = catchAsync(async (req: Request, res: Response) => {
          const content = await CmsService.deleteStaticContentByKey(req.params.key as TStaticContentKey);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Static content deleted successfully',
               data: content,
          });
     });
}

export default new CmsController();
