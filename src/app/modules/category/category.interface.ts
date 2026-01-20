import { Types } from 'mongoose';

export interface ICategory {
     _id?: Types.ObjectId;
     title: string;
     slug: string;
     description?: string;
     image?: string;
     icon?: string;
     isActive: boolean;
     order: number;
     streamCount: number;
     createdAt?: Date;
     updatedAt?: Date;
}
