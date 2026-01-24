import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError.js';
import { Category } from './category.model.js';
import { logger, errorLogger } from '../../../shared/logger.js';

class CategoryService {
     /**
      * Create a new category (Admin only)
      */
     static async createCategory(categoryData: any) {
          try {
               const existingCategory = await Category.findOne({
                    title: categoryData.title,
               });

               if (existingCategory) {
                    throw new AppError(
                         StatusCodes.CONFLICT,
                         'Category with this title already exists',
                    );
               }

               const category = new Category(categoryData);
               await category.save();

               logger.info(`Category created: ${category._id}`);
               return category;
          } catch (error) {
               errorLogger.error('Create category error', error);
               throw error;
          }
     }

     /**
      * Get all categories
      */
     static async getAllCategories(includeInactive: boolean = false) {
          try {
               const categories = await Category.find().sort({ title: 1 });

               return categories;
          } catch (error) {
               errorLogger.error('Get all categories error', error);
               throw error;
          }
     }

     /**
      * Get category by ID
      */
     static async getCategoryById(categoryId: string) {
          try {
               const category = await Category.findById(categoryId);

               if (!category) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Category not found');
               }

               return category;
          } catch (error) {
               errorLogger.error('Get category error', error);
               throw error;
          }
     }

     /**
      * Update category (Admin only)
      */
     static async updateCategory(categoryId: string, updateData: any) {
          try {
               // Only allow title and image fields to be updated
               const sanitizedData: any = {};
               if (updateData.title !== undefined) sanitizedData.title = updateData.title;
               if (updateData.image !== undefined) sanitizedData.image = updateData.image;

               // Check if title is being updated and if it already exists (excluding current document)
               if (sanitizedData.title) {
                    const existingCategory = await Category.findOne({
                         title: sanitizedData.title,
                         _id: { $ne: categoryId },
                    });

                    if (existingCategory) {
                         throw new AppError(
                              StatusCodes.CONFLICT,
                              'Category with this title already exists',
                         );
                    }
               }

               const category = await Category.findByIdAndUpdate(categoryId, sanitizedData, {
                    new: true,
                    runValidators: true,
               });

               if (!category) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Category not found');
               }

               logger.info(`Category updated: ${categoryId}`);
               return category;
          } catch (error) {
               errorLogger.error('Update category error', error);
               throw error;
          }
     }

     /**
      * Delete category (Admin only)
      */
     static async deleteCategory(categoryId: string) {
          try {
               const category = await Category.findByIdAndDelete(categoryId);

               if (!category) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Category not found');
               }

               logger.info(`Category deleted: ${categoryId}`);
               return category;
          } catch (error) {
               errorLogger.error('Delete category error', error);
               throw error;
          }
     }

     /**
      * Increment stream count for category
      */
     static async incrementStreamCount(categoryId: string) {
          try {
               await Category.findByIdAndUpdate(categoryId, {
                    $inc: { streamCount: 1 },
               });
          } catch (error) {
               errorLogger.error('Increment stream count error', error);
          }
     }

     /**
      * Decrement stream count for category
      */
     static async decrementStreamCount(categoryId: string) {
          try {
               await Category.findByIdAndUpdate(categoryId, {
                    $inc: { streamCount: -1 },
               });
          } catch (error) {
               errorLogger.error('Decrement stream count error', error);
          }
     }
}

export default CategoryService;
