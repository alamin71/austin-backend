import { Router } from 'express';
import PollController from './poll.controller.js';
import auth from '../../middleware/auth.js';
import validateRequest from '../../middleware/validateRequest.js';
import {
     addPollOptionSchema,
     createPollSchema,
     deletePollOptionSchema,
     votePollSchema,
} from './poll.validation.js';
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

// Add option (Streamer only)
router.patch(
     '/:pollId/options/add',
     auth(USER_ROLES.USER),
     validateRequest(addPollOptionSchema),
     PollController.addOption,
);

// Delete option (Streamer only)
router.patch(
     '/:pollId/options/delete',
     auth(USER_ROLES.USER),
     validateRequest(deletePollOptionSchema),
     PollController.deleteOption,
);

const PollRouter = router;
export default PollRouter;
