import { Schema, model } from 'mongoose';

export interface IWebsiteLogo {
     logo: string;
     status: 'light' | 'dark';
}

const websiteLogoSchema = new Schema<IWebsiteLogo>(
     {
          logo: {
               type: String,
               required: true,
          },
          status: {
               type: String,
               required: true,
          },
     },
     {
          timestamps: true,
     },
);

export const WebsiteLogo = model<IWebsiteLogo>('WebsiteLogo', websiteLogoSchema);
