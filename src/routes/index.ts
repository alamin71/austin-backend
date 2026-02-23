import express from 'express';
import { UserRouter } from '../app/modules/user/user.route.js';
import { AuthRouter } from '../app/modules/auth/auth.route.js';
import { AdminRoutes } from '../app/modules/admin/admin.route.js';
import { StreamRouter } from '../app/modules/stream/stream.route.js';
import { CategoryRouter } from '../app/modules/category/category.route.js';
import GiftRouter from '../app/modules/gift/gift.route.js';
import PollRouter from '../app/modules/poll/poll.route.js';
import { TestRouter } from '../app/modules/test/test.route.js';
import AnalyticsRouter from '../app/modules/stream/analytics.route.js';
import SubscriptionRouter from '../app/modules/subscription/subscription.route.js';
import WalletRouter from '../app/modules/wallet/wallet.route.js';

const router = express.Router();
const routes = [
     {
          path: '/auth',
          route: AuthRouter,
     },
     {
          path: '/admin',
          route: AdminRoutes,
     },
     {
          path: '/user',
          route: UserRouter,
     },
     {
          path: '/stream',
          route: StreamRouter,
     },
     {
          path: '/analytics',
          route: AnalyticsRouter,
     },
     {
          path: '/category',
          route: CategoryRouter,
     },
     {
          path: '/subscription',
          route: SubscriptionRouter,
     },
     {
          path: '/wallet',
          route: WalletRouter,
     },
     {
          path: '/gift',
          route: GiftRouter,
     },
     {
          path: '/poll',
          route: PollRouter,
     },
     {
          path: '/test',
          route: TestRouter,
     },
];

routes.forEach((element) => {
     if (element?.path && element?.route) {
          router.use(element?.path, element?.route);
     }
});

export default router;
