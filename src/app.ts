import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import router from './routes/index.js';
import { Morgan } from './shared/morgen.js';
import globalErrorHandler from './globalErrorHandler/globalErrorHandler.js';
import { notFound } from './app/middleware/notFound.js';
import { welcome } from './utils/welcome.js';
import config from './config/index.js';
import path from 'path';

const __dirname = path.resolve();
const app: Application = express();
const allowedOrigins = config.allowed_origins;

const corsOptions: cors.CorsOptions = {
     origin: (origin, callback) => {
          // Allow tools like Postman/curl and same-origin requests with no Origin header.
          if (!origin) {
               return callback(null, true);
          }

          if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
               return callback(null, true);
          }

          return callback(new Error(`CORS blocked for origin: ${origin}`));
     },
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
     allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'Accept',
          'Origin',
          'Access-Control-Request-Method',
          'Access-Control-Request-Headers',
     ],
     exposedHeaders: ['Content-Length', 'Content-Type'],
     maxAge: 86400, // 24 hours
     preflightContinue: false,
     optionsSuccessStatus: 204,
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
//morgan
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);

//body parser
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//file retrieve
app.use(express.static('uploads'));
app.use(express.static('public'));

//router
app.use('/api/v1', router);
//live response
app.get('/', (req: Request, res: Response) => {
     res.send(welcome());
});

//global error handle
app.use(globalErrorHandler);

//handle not found route;
app.use(notFound);

export default app;
