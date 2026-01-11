import Menu from '../models/Menu.js';
import { uploadImage, deleteImage } from '../utils/cloudinary.js';

export const getMenus = async (req, res) => {
  try {
    const menus = await Menu.find({ isAvailable: true })
      .populate('category')
      .sort({ displayOrder: 1 });
    res.json(menus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createMenu = async (req, res) => {
  try {
    const { name, price, category, description, image } = req.body;

    let imageUrl = null;
    if (image && image.startsWith('data:')) {
      imageUrl = await uploadImage(image, 'menus');
    } else {
      imageUrl = image;
    }

    const menu = new Menu({
      name,
      price,
      category,
      description,
      image: imageUrl
    });

    await menu.save();
    await menu.populate('category');
    res.status(201).json(menu);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category, description, image } = req.body;

    let imageUrl = image;
    if (image && image.startsWith('data:')) {
      imageUrl = await uploadImage(image, 'menus');
    }

    const menu = await Menu.findByIdAndUpdate(
      id,
      { name, price, category, description, image: imageUrl },
      { new: true }
    ).populate('category');

    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const menu = await Menu.findById(id);
    
    // Delete image from cloudinary if exists
    if (menu && menu.image) {
      await deleteImage(menu.image);
    }
    
    await Menu.findByIdAndDelete(id);
    res.json({ message: 'Menu deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
