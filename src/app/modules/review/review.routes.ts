import express, { NextFunction, Request, Response } from 'express';
import { USER_ROLES } from '../../../enums/user';
import { ReviewController } from './review.controller';
import { ReviewValidation } from './review.validation';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
const router = express.Router();

router.post(
     '/',
     auth(USER_ROLES.USER),
     validateRequest(ReviewValidation.reviewZodSchema),
     async (req: Request, res: Response, next: NextFunction): Promise<void> => {
          try {
               const { rating, ...othersData } = req.body;
               const { id }: any = req.user;
               req.body = { ...othersData, customer: id, rating: Number(rating) };
               next();
          } catch (error) {
               console.log(error);
               res.status(500).json({ message: 'Failed to convert string to number' });
          }
     },
     auth(USER_ROLES.USER),
     ReviewController.createReview,
);

export const ReviewRoutes = router;
