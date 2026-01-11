import User from '../models/User.js';
import Staff from '../models/Staff.js';

export const getStaff = async (req, res) => {
  try {
    const staff = await Staff.find({ isActive: true }).populate('user');
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createStaff = async (req, res) => {
  try {
    const { username, password, role = 'staff' } = req.body;

    // Create user with username
    const user = new User({
      username,
      password,
      name: username, // Use username as default name
      role
    });

    await user.save();

    // Create staff profile
    const staff = new Staff({
      user: user._id
    });

    await staff.save();
    await staff.populate('user');
    res.status(201).json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role } = req.body;

    // Find staff and get user
    const staff = await Staff.findById(id).populate('user');
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    // Update user
    if (username) staff.user.username = username;
    if (password) staff.user.password = password;
    if (role) staff.user.role = role;

    await staff.user.save();
    await staff.populate('user');

    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    await Staff.findByIdAndDelete(id);
    res.json({ message: 'Staff deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
