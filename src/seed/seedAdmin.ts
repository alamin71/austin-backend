import mongoose from 'mongoose';
import { User } from '../app/modules/user/user.model.js';
import config from '../config/index.js';
import { USER_ROLES } from '../enums/user.js';
import { logger } from '../shared/logger.js';

// Only admin user data - Regular users will register via app signup
const adminData = {
     name: 'Administrator',
     userName: 'admin',
     email: config.super_admin.email,
     role: USER_ROLES.SUPER_ADMIN,
     password: config.super_admin.password,
     authProvider: 'email',
     isEmailVerified: true,
     verified: true,
};

// Function to seed admin user
const seedAdmin = async () => {
     try {
          // Check if admin already exists
          const existingAdmin = await User.findOne({ email: adminData.email });
          
          if (existingAdmin) {
               logger.info('ℹ️ Admin user already exists. Skipping creation...');
               return;
          }

          // Do NOT hash here - let the model pre-save hook handle it
          const adminUser = { ...adminData };

          // Create only the admin user
          await User.create(adminUser);
          logger.info('✨ Admin user created successfully ✨');
     } catch (err) {
          logger.error('💥 Error creating admin user: 💥', err);
          throw err;
     }
};

// Connect to MongoDB
mongoose.connect(config.database_url as string);

const seedSuperAdmin = async () => {
     try {
          logger.info('🎨 Admin seeding started 🎨');

          // Seed only admin user
          await seedAdmin();
          
          logger.info('🎉 Admin seeding completed successfully! 🎉');
          logger.info(`📧 Admin Email: ${adminData.email}`);
          logger.info('⚠️  Regular users will register via app signup');
     } catch (error) {
          logger.error('🔥 Error in admin seeding: 🔥', error);
          process.exit(1);
     } finally {
          await mongoose.disconnect();
     }
};

seedSuperAdmin();
