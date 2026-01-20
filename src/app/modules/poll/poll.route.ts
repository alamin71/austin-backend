import { Router } from 'express';
import PollController from './poll.controller';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { createPollSchema, votePollSchema } from './poll.validation';

const router = Router();

// Create poll (Streamer only)
router.post(
     '/stream/:streamId/create',
     auth('streamer', 'business'),
     validateRequest(createPollSchema),
     PollController.createPoll,
);

// Vote on poll
router.post(
     '/:pollId/vote',
     auth('user', 'streamer', 'business'),
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
     auth('streamer', 'business'),
     PollController.endPoll,
);

// Delete poll (Streamer only)
router.delete(
     '/:pollId',
     auth('streamer', 'business'),
     PollController.deletePoll,
);

const PollRouter = router;
export default PollRouter;
