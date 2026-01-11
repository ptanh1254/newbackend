import Category from '../models/Category.js';
import { uploadImage, deleteImage } from '../utils/cloudinary.js';

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body;

    let imageUrl = null;
    if (image && image.startsWith('data:')) {
      imageUrl = await uploadImage(image, 'categories');
    } else {
      imageUrl = image;
    }

    const category = new Category({
      name,
      description,
      image: imageUrl
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image } = req.body;

    let imageUrl = image;
    if (image && image.startsWith('data:')) {
      imageUrl = await uploadImage(image, 'categories');
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { name, description, image: imageUrl },
      { new: true }
    );

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    
    // Delete image from cloudinary if exists
    if (category && category.image) {
      await deleteImage(category.image);
    }
    
    await Category.findByIdAndDelete(id);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
