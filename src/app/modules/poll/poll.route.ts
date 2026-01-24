import { Router } from 'express';
import PollController from './poll.controller.js';
import auth from '../../middleware/auth.js';
import validateRequest from '../../middleware/validateRequest.js';
import { createPollSchema, votePollSchema } from './poll.validation.js';
import { USER_ROLES } from '../../../enums/user.js';

const router = Router();

// Create poll (Streamer only)
router.post(
     '/stream/:streamId/create',
     auth(USER_ROLES.USER),
     validateRequest(createPollSchema),
     PollController.createPoll,
);

// Vote on poll
router.post(
     '/:pollId/vote',
     auth(USER_ROLES.USER),
     validateRequest(votePollSchema),
     PollController.votePoll,
);

// Get poll results
router.get('/:pollId/results', PollController.getPollResults);

// Get active poll for stream
router.get('/stream/:streamId/active', PollController.getActivePoll);

// Get all polls for stream
router.get('/stream/:streamId/all', PollController.getStreamPolls);

// End poll (Streamer only)
router.post(
     '/:pollId/end',
     auth(USER_ROLES.USER),
     PollController.endPoll,
);

// Delete poll (Streamer only)
router.delete(
     '/:pollId',
     auth(USER_ROLES.USER),
     PollController.deletePoll,
);

const PollRouter = router;
export default PollRouter;
