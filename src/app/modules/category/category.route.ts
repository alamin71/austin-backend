import express from 'express';
import categoryController from './category.controller.js';

const router = express.Router();

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/:categoryId', categoryController.getCategoryById);
router.get('/:categoryId/livestreams', categoryController.getLiveStreamsByCategory);

export const CategoryRouter = router;
