import { Router } from 'express';
import GiftController from './gift.controller.js';
import auth from '../../middleware/auth.js';
import validateRequest from '../../middleware/validateRequest.js';
import {
     createGiftSchema,
     updateGiftSchema,
     sendGiftSchema,
} from './gift.validation.js';

const router = Router();

// Public routes
router.get('/', GiftController.getAllGifts);
router.get('/category/:category', GiftController.getGiftsByCategory);
router.get('/:giftId', GiftController.getGiftById);

// Admin routes
router.post(
     '/',
     auth('admin'),
     validateRequest(createGiftSchema),
     GiftController.createGift,
);
router.put(
     '/:giftId',
     auth('admin'),
     validateRequest(updateGiftSchema),
     GiftController.updateGift,
);
router.delete('/:giftId', auth('admin'), GiftController.deleteGift);

// User routes
router.post(
     '/send/:streamId',
     auth('user', 'streamer', 'business'),
     validateRequest(sendGiftSchema),
     GiftController.sendGift,
);
router.get(
     '/stream/:streamId/list',
     auth('user', 'streamer', 'business', 'admin'),
     GiftController.getStreamGifts,
);
router.get(
     '/streamer/received',
     auth('streamer', 'business'),
     GiftController.getStreamerGifts,
);

const GiftRouter = router;
export default GiftRouter;
