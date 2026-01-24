import { Schema, model } from 'mongoose';
import { ICategory } from './category.interface.js';

const categorySchema = new Schema<ICategory>(
     {
          title: {
               type: String,
               required: true,
               unique: true,
               trim: true,
          },
          image: {
               type: String,
               required: true,
          },
     },
     {
          timestamps: true,
     },
);

export const Category = model<ICategory>('Category', categorySchema);
