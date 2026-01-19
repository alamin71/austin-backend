import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import processError from './processError.js';
import config from '../config/index.js';

export const globalErrorHandler: ErrorRequestHandler = (error: any, req: Request, res: Response, _next: NextFunction) => {
     // Process the all error function
     const { statusCode, message, errorSources } = processError(error);

     // Respond with a consistent error structure
     res.status(statusCode).json({
          success: false,
          message,
          statusCode,
          error: errorSources,
          stack: config.node_env === 'development' ? error?.stack : undefined,
     });
};

export default globalErrorHandler;
