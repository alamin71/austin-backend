import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError.js';
import { errorLogger, logger } from '../../../shared/logger.js';
import { TStaticContentKey } from './cms.interface.js';
import { Faq, StaticContent } from './cms.model.js';

class CmsService {
     static async createFaq(payload: { question: string; answer: string }) {
          try {
               const faq = await Faq.create(payload);
               logger.info(`FAQ created: ${faq._id}`);
               return faq;
          } catch (error) {
               errorLogger.error('Create FAQ error', error);
               throw error;
          }
     }

     static async getAllFaqs() {
          try {
               return Faq.find().sort({ createdAt: -1 });
          } catch (error) {
               errorLogger.error('Get all FAQs error', error);
               throw error;
          }
     }

     static async getFaqById(faqId: string) {
          try {
               const faq = await Faq.findById(faqId);
               if (!faq) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'FAQ not found');
               }
               return faq;
          } catch (error) {
               errorLogger.error('Get FAQ by id error', error);
               throw error;
          }
     }

     static async updateFaq(faqId: string, payload: { question?: string; answer?: string }) {
          try {
               const faq = await Faq.findByIdAndUpdate(faqId, payload, {
                    new: true,
                    runValidators: true,
               });

               if (!faq) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'FAQ not found');
               }

               logger.info(`FAQ updated: ${faqId}`);
               return faq;
          } catch (error) {
               errorLogger.error('Update FAQ error', error);
               throw error;
          }
     }

     static async deleteFaq(faqId: string) {
          try {
               const faq = await Faq.findByIdAndDelete(faqId);
               if (!faq) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'FAQ not found');
               }

               logger.info(`FAQ deleted: ${faqId}`);
               return faq;
          } catch (error) {
               errorLogger.error('Delete FAQ error', error);
               throw error;
          }
     }

     static async createStaticContent(payload: { key: TStaticContentKey; content: string }) {
          try {
               const existing = await StaticContent.findOne({ key: payload.key });
               if (existing) {
                    throw new AppError(
                         StatusCodes.CONFLICT,
                         'Content for this key already exists. Use update endpoint instead',
                    );
               }

               const content = await StaticContent.create(payload);
               logger.info(`Static content created: ${payload.key}`);
               return content;
          } catch (error) {
               errorLogger.error('Create static content error', error);
               throw error;
          }
     }

     static async getAllStaticContents() {
          try {
               return StaticContent.find().sort({ key: 1 });
          } catch (error) {
               errorLogger.error('Get all static contents error', error);
               throw error;
          }
     }

     static async getStaticContentByKey(key: TStaticContentKey) {
          try {
               const content = await StaticContent.findOne({ key });
               if (!content) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Content not found');
               }
               return content;
          } catch (error) {
               errorLogger.error('Get static content by key error', error);
               throw error;
          }
     }

     static async updateStaticContentByKey(key: TStaticContentKey, payload: { content: string }) {
          try {
               const content = await StaticContent.findOneAndUpdate({ key }, payload, {
                    new: true,
                    runValidators: true,
               });

               if (!content) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Content not found');
               }

               logger.info(`Static content updated: ${key}`);
               return content;
          } catch (error) {
               errorLogger.error('Update static content error', error);
               throw error;
          }
     }

     static async deleteStaticContentByKey(key: TStaticContentKey) {
          try {
               const content = await StaticContent.findOneAndDelete({ key });
               if (!content) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Content not found');
               }

               logger.info(`Static content deleted: ${key}`);
               return content;
          } catch (error) {
               errorLogger.error('Delete static content error', error);
               throw error;
          }
     }
}

export default CmsService;
