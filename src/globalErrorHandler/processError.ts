import { ZodError } from 'zod';
import handleZodError from '../errors/handleZodError.js';
import handleValidationError from '../errors/handleValidationError.js';
import handleCastError from '../errors/handleCastError.js';
import handleDuplicateError from '../errors/handleDuplicateError.js';
import AppError from '../errors/AppError.js';
import { StatusCodes } from 'http-status-codes';
const processError = (err: any) => {
     if (err instanceof ZodError) return handleZodError(err);
     if (err?.name === 'validationError') return handleValidationError(err);
     if (err?.name === 'CastError') return handleCastError(err);
     if (err?.code === 11000) return handleDuplicateError(err);
     if (err instanceof AppError) {
          return {
               statusCode: err?.statusCode,
               message: err?.message,
               errorSources: err?.message ? [{ path: '', message: err?.message }] : [],
          };
     }
     if (err.name === 'TokenExpiredError') {
          return {
               statusCode: StatusCodes.UNAUTHORIZED,
               message: 'Session Expired',
               errorSources: err?.message
                    ? [
                           {
                                path: '',
                                message: 'Your session has expired. Please log in again to continue.',
                           },
                      ]
                    : [],
          };
     }

     if (err instanceof Error) {
          return {
               statusCode: StatusCodes.BAD_REQUEST,
               message: err?.message,
               errorSources: err.message ? [{ path: '', message: err?.message }] : [],
          };
     }
     return {
          statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
          message: 'Something went wrong!',
          errorSources: [],
     };
};

export default processError;
