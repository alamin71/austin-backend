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
import ChallengeRouter from '../app/modules/challenge/challenge.route.js';
import { friendRequestRoutes } from '../app/modules/friendRequest/friendRequest.route.js';
import { messageRoutes } from '../app/modules/message/message.route.js';
import { followRoutes } from '../app/modules/follow/follow.route.js';
import { notificationRoutes } from '../app/modules/notification/notification.route.js';
import { FeedbackRouter } from '../app/modules/feedback/feedback.route.js';
import { CustomerSupportRouter } from '../app/modules/customerSupport/customerSupport.route.js';
import { ReportRouter } from '../app/modules/report/report.route.js';
import { MomentRouter } from '../app/modules/moment/moment.route.js';
import { CommunityPulseRouter } from '../app/modules/communityPulse/communityPulse.route.js';
import { allPollsRouter } from '../app/modules/poll/poll.route.js';

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
          path: '/challenge',
          route: ChallengeRouter,
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
          path: '/polls',
          route: allPollsRouter,
     },
     {
          path: '/friend',
          route: friendRequestRoutes,
     },
     {
          path: '/message',
          route: messageRoutes,
     },
     {
          path: '/follow',
          route: followRoutes,
     },
     {
          path: '/notification',
          route: notificationRoutes,
     },
     {
          path: '/feedback',
          route: FeedbackRouter,
     },
     {
          path: '/support',
          route: CustomerSupportRouter,
     },
     {
          path: '/test',
          route: TestRouter,
     },
     {
          path: '/report',
          route: ReportRouter,
     },
     {
          path: '/moment',
          route: MomentRouter,
     },
     {
          path: '/community-pulse',
          route: CommunityPulseRouter,
     },
];

routes.forEach((element) => {
     if (element?.path && element?.route) {
          router.use(element?.path, element?.route);
     }
});

export default router;
