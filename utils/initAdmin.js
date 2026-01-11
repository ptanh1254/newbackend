import User from '../models/User.js';

export const initializeAdmin = async () => {
  try {
    // Delete any existing admin users
    await User.deleteMany({ username: 'admin' });
    
    // Create fresh admin user
    const admin = new User({
      username: 'admin',
      email: 'admin@mrduc.com',
      password: process.env.ADMIN_PASSWORD || '123123',
      name: 'Admin',
      role: 'admin'
    });
    
    await admin.save();
    console.log('✓ Admin user created fresh - username: admin, password: 123123');
  } catch (error) {
    console.log('Error initializing admin:', error.message);
  }
};
