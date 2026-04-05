import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
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
const multipartParser = multer({ storage: multer.memoryStorage() });

const normalizePollCreateBody = (
     req: Request,
     _res: Response,
     next: NextFunction,
) => {
     const source = (req.body || {}) as Record<string, unknown>;
     const normalizedEntries = Object.entries(source).map(
          ([key, value]): [string, unknown] => [key.trim().toLowerCase(), value],
     );

     const normalizedMap = new Map<string, unknown>(normalizedEntries);
     const readField = (...keys: string[]) => {
          for (const key of keys) {
               const value = normalizedMap.get(key.toLowerCase());
               if (typeof value !== 'undefined') return value;
          }
          return undefined;
     };

     let options = readField('options', 'polloptions', 'polloption');
     if (!options) {
          const optionFields = Object.entries(source)
               .filter(([key]) => /^option\d+$/i.test(key.trim()))
               .sort(([a], [b]) => a.localeCompare(b))
               .map(([, value]) => value)
               .filter((value) => typeof value === 'string' && value.trim().length > 0);

          if (optionFields.length) {
               options = optionFields;
          }
     }

     if (typeof options === 'string') {
          let parsed = options.trim();
          // Try to parse JSON array string
          try {
               parsed = JSON.parse(parsed);
               if (Array.isArray(parsed)) {
                    options = parsed;
               } else {
                    options = [parsed];
               }
          } catch {
               // fallback: comma split
               options = parsed.split(',').map((o) => o.trim()).filter(Boolean);
          }
     }

     req.body = {
          question: readField('question', 'pollquestion'),
          description: readField('description', 'details', 'polldescription'),
          options,
          allowMultipleVotes: readField(
               'allowmultiplevotes',
               'allow_multiple_votes',
               'allowmultivotes',
          ),
     };

     next();
};

// General poll create route (no streamId)
router.post(
     '/create',
     auth(USER_ROLES.USER),
     multipartParser.any(),
     normalizePollCreateBody,
     validateRequest(createPollSchema),
     PollController.createGeneralPoll,
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


// Get all active polls (not stream-specific)
router.get('/active', PollController.getAllActivePolls);

// Get active poll for stream
router.get('/stream/:streamId/active', PollController.getActivePoll);


// Get all polls created by the authenticated user (with or without streamId)
router.get(
    '/all',
    auth(USER_ROLES.USER),
    PollController.getMyPolls,
);

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
router.delete(
     '/:pollId/options/delete',
     auth(USER_ROLES.USER),
     validateRequest(deletePollOptionSchema),
     PollController.deleteOption,
);

const PollRouter = router;
export default PollRouter;
