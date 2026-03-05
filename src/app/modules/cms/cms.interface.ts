import { Types } from 'mongoose';

export type TStaticContentKey = 'privacyPolicy' | 'termsOfService' | 'aboutUs';

export interface IFaq {
     _id?: Types.ObjectId;
     question: string;
     answer: string;
     createdAt?: Date;
     updatedAt?: Date;
}

export interface IStaticContent {
     _id?: Types.ObjectId;
     key: TStaticContentKey;
     content: string;
     createdAt?: Date;
     updatedAt?: Date;
}
