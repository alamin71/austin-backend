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
          slug: {
               type: String,
               unique: true,
               lowercase: true,
               sparse: true,
          },
          description: {
               type: String,
               trim: true,
          },
          image: {
               type: String,
               required: true,
          },
          icon: {
               type: String,
          },
          isActive: {
               type: Boolean,
               default: true,
          },
          streamCount: {
               type: Number,
               default: 0,
          },
     },
     {
          timestamps: true,
     },
);

// Index for active categories
categorySchema.index({ isActive: 1, order: 1 });

export const Category = model<ICategory>('Category', categorySchema);
