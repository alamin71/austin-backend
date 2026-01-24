import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import CategoryService from './category.service.js';
import AppError from '../../../errors/AppError.js';
import { uploadFileToS3, deleteFileFromS3 } from '../../../helpers/s3Helper.js';

class CategoryController {
         createCategory = catchAsync(async (req: Request, res: Response) => {
              const categoryData: any = req.body;

              // Upload image to S3
              const files: any = req.files;
              const imageFile = files?.image?.[0];
         if (imageFile) {
                   const s3Url = await uploadFileToS3(imageFile, 'category');
                   categoryData.image = s3Url;
         }

         // enforce image required
         if (!categoryData.image) {
              throw new AppError(StatusCodes.BAD_REQUEST, 'Image is required');
         }

              const category = await CategoryService.createCategory(categoryData);

          sendResponse(res, {
               statusCode: StatusCodes.CREATED,
               success: true,
               message: 'Category created successfully',
               data: category,
          });
     });

     getAllCategories = catchAsync(async (req: Request, res: Response) => {
          const includeInactive = req.query.includeInactive === 'true';
          const categories = await CategoryService.getAllCategories(includeInactive);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Categories retrieved successfully',
               data: categories,
          });
     });

     getCategoryById = catchAsync(async (req: Request, res: Response) => {
          const { categoryId } = req.params;
          const category = await CategoryService.getCategoryById(categoryId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Category retrieved successfully',
               data: category,
          });
     });

     updateCategory = catchAsync(async (req: Request, res: Response) => {
          const { categoryId } = req.params;
         const updateData: any = req.body;

         // Upload new image to S3 if provided
         const files: any = req.files;
         const imageFile = files?.image?.[0];
         if (imageFile) {
              const s3Url = await uploadFileToS3(imageFile, 'category');
              updateData.image = s3Url;
         }

          const category = await CategoryService.updateCategory(categoryId, updateData);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Category updated successfully',
               data: category,
          });
     });

     deleteCategory = catchAsync(async (req: Request, res: Response) => {
          const { categoryId } = req.params;
          await CategoryService.deleteCategory(categoryId);

          sendResponse(res, {
               statusCode: StatusCodes.OK,
               success: true,
               message: 'Category deleted successfully',
               data: null,
          });
     });
}

export default new CategoryController();
