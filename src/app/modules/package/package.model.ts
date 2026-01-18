import { Schema, model } from 'mongoose';
import { IPackage } from './package.interface';

const packageSchema = new Schema<IPackage>({
     name: { type: String, required: true },
     description: { type: String, required: true },
     price: { type: Number, required: true },
     createdAt: { type: Date, default: Date.now },
});

export const Package = model<IPackage>('Package', packageSchema);
