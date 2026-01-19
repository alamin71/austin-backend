import express from 'express';
import { UserRouter } from '../app/modules/user/user.route';
import { AuthRouter } from '../app/modules/auth/auth.route';
import { StreamRouter } from '../app/modules/stream/stream.route';
import { TestRouter } from '../app/modules/test/test.route';

const router = express.Router();
const routes = [
     {
          path: '/auth',
          route: AuthRouter,
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
