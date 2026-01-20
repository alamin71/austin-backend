import express from 'express';
import categoryController from './category.controller.js';
import auth from '../../middleware/auth.js';
import validateRequest from '../../middleware/validateRequest.js';
import fileUploadHandler from '../../middleware/fileUploadHandler.js';
import { createCategorySchema, updateCategorySchema } from './category.validation.js';

const router = express.Router();

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/:categoryId', categoryController.getCategoryById);

// Admin only routes - Create Category (with image upload)
router.post(
     '/create-category',
     auth('admin'),
     fileUploadHandler(),
     validateRequest(createCategorySchema),
     categoryController.createCategory,
);

// Admin only routes - Update Category (with image upload)
router.put(
     '/:categoryId',
     auth('admin'),
     fileUploadHandler(),
     validateRequest(updateCategorySchema),
     categoryController.updateCategory,
);

router.delete('/:categoryId', auth('admin'), categoryController.deleteCategory);

export const CategoryRouter = router;
