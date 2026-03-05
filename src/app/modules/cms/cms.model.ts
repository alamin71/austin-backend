import { Schema, model } from 'mongoose';
import { IFaq, IStaticContent } from './cms.interface.js';

const faqSchema = new Schema<IFaq>(
     {
          question: {
               type: String,
               required: true,
               trim: true,
          },
          answer: {
               type: String,
               required: true,
               trim: true,
          },
     },
     {
          timestamps: true,
     },
);

const staticContentSchema = new Schema<IStaticContent>(
     {
          key: {
               type: String,
               enum: ['privacyPolicy', 'termsOfService', 'aboutUs'],
               required: true,
               unique: true,
          },
          content: {
               type: String,
               required: true,
          },
     },
     {
          timestamps: true,
     },
);

export const Faq = model<IFaq>('Faq', faqSchema);
export const StaticContent = model<IStaticContent>('StaticContent', staticContentSchema);
