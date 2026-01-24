import { Router } from 'express';
import GiftController from './gift.controller.js';
import auth from '../../middleware/auth.js';
import validateRequest from '../../middleware/validateRequest.js';
import { USER_ROLES } from '../../../enums/user.js';
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
     auth(USER_ROLES.ADMIN),
     validateRequest(createGiftSchema),
     GiftController.createGift,
);
router.put(
     '/:giftId',
     auth(USER_ROLES.ADMIN),
     validateRequest(updateGiftSchema),
     GiftController.updateGift,
);
router.delete('/:giftId', auth(USER_ROLES.ADMIN), GiftController.deleteGift);

// User routes
router.post(
     '/send/:streamId',
     auth(USER_ROLES.USER),
     validateRequest(sendGiftSchema),
     GiftController.sendGift,
);
router.get(
     '/stream/:streamId/list',
     auth(USER_ROLES.USER, USER_ROLES.ADMIN),
     GiftController.getStreamGifts,
);
router.get(
     '/streamer/received',
     auth(USER_ROLES.USER),
     GiftController.getStreamerGifts,
);

const GiftRouter = router;
export default GiftRouter;
