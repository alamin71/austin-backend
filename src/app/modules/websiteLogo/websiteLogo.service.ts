import { StatusCodes } from 'http-status-codes';
import { IWebsiteLogo, WebsiteLogo } from './websiteLogo.model';
import AppError from '../../../errors/AppError';

const createOrUpdateLogoToDB = async (files: any, status: string): Promise<IWebsiteLogo> => {
     console.log('first', status);
     if (!files || !files.image || !files.image[0]) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Image is required');
     }

     const logoPath = `/images/${files.image[0].filename}`;

     // Dynamically handle both light and dark statuses
     const result = await WebsiteLogo.findOneAndReplace({ status }, { logo: logoPath, status }, { new: true, upsert: true });

     return result;
};

const getLogoFromDB = async () => {
     const result = await WebsiteLogo.find();
     if (!result) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Faild to load image');
     }

     return result;
};

export const WebsiteLogoService = {
     createOrUpdateLogoToDB,
     getLogoFromDB,
};
