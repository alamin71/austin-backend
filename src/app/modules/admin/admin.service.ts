import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError.js';
import { IUser } from '../user/user.interface.js';
import { User } from '../user/user.model.js';

const createAdminToDB = async (payload: IUser): Promise<IUser> => {
     const createAdmin: any = await User.create(payload);
     if (!createAdmin) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to create Admin');
     }
     if (createAdmin) {
          await User.findByIdAndUpdate({ _id: createAdmin?._id }, { verified: true }, { new: true });
     }
     return createAdmin;
};

const deleteAdminFromDB = async (id: any): Promise<IUser | undefined> => {
     const isExistAdmin = await User.findByIdAndDelete(id);
     if (!isExistAdmin) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to delete Admin');
     }
     return;
};

const getAdminFromDB = async (): Promise<IUser[]> => {
     const admins = await User.find({ role: 'ADMIN' }).select('name email profile contact location');
     return admins;
};

const getAdminProfileById = async (adminId: string): Promise<IUser | null> => {
     const admin = await User.findById(adminId).select('-password');
     if (!admin) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Admin not found');
     }
     return admin;
};

export const AdminService = {
     createAdminToDB,
     deleteAdminFromDB,
     getAdminFromDB,
     getAdminProfileById,
};
