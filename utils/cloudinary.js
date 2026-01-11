import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadImage = async (file, folder) => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: `mrduc-pos/${folder}`,
      resource_type: 'auto'
    });
    return result.secure_url;
  } catch (error) {
    throw new Error('Image upload failed: ' + error.message);
  }
};

export const deleteImage = async (imageUrl) => {
  try {
    if (!imageUrl) return;
    
    // Extract public_id from cloudinary URL
    // URL format: https://res.cloudinary.com/cloud_name/image/upload/v.../folder/public_id.ext
    const matches = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-z]+$/i);
    if (matches && matches[1]) {
      const publicId = matches[1];
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error) {
    console.log('Error deleting image:', error);
  }
};
