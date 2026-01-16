// import { Schema, model, Types } from 'mongoose';

// export interface IResetToken {
//      user: Types.ObjectId;
//      token: string;
//      expireAt: Date;
// }

// interface ResetTokenModelType {
//      isExistToken(token: string): Promise<IResetToken | null>;
//      isExpireToken(token: string): Promise<boolean>;
// }

// const resetTokenSchema = new Schema<IResetToken, ResetTokenModelType>({
//      user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//      token: { type: String, required: true, unique: true },
//      expireAt: { type: Date, required: true, index: { expires: 0 } },
// });

// resetTokenSchema.statics.isExistToken = async function (token: string) {
//      return this.findOne({ token });
// };

// resetTokenSchema.statics.isExpireToken = async function (token: string) {
//      const tokenDoc = await this.findOne({ token });
//      if (!tokenDoc) return false;
//      return tokenDoc.expireAt > new Date();
// };

// export const ResetToken = model<IResetToken, ResetTokenModelType>('ResetToken', resetTokenSchema);
