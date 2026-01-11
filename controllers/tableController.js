import Table from '../models/Table.js';
import mongoose from 'mongoose';

export const getTables = async (req, res) => {
  try {
    const tables = await Table.find({ isActive: true });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createTable = async (req, res) => {
  try {
    const { tableNumber, zone, capacity, posX, posY } = req.body;

    // Check if tableNumber already exists
    const existingTable = await Table.findOne({ tableNumber });
    if (existingTable) {
      return res.status(400).json({ error: 'Số bàn này đã tồn tại' });
    }

    const table = new Table({
      tableNumber,
      zone: zone || '',
      capacity,
      posX,
      posY
    });

    await table.save();
    res.status(201).json(table);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { tableNumber, zone, capacity, status, posX, posY } = req.body;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID không hợp lệ' });
    }

    const updateData = {};
    if (tableNumber !== undefined) updateData.tableNumber = tableNumber;
    if (zone !== undefined) updateData.zone = zone;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (status !== undefined) updateData.status = status;
    if (posX !== undefined) updateData.posX = posX;
    if (posY !== undefined) updateData.posY = posY;

    // Check if tableNumber already exists (if changing it)
    if (tableNumber !== undefined) {
      const existingTable = await Table.findOne({ 
        tableNumber, 
        _id: { $ne: new mongoose.Types.ObjectId(id) } 
      });
      if (existingTable) {
        return res.status(400).json({ error: 'Số bàn này đã tồn tại' });
      }
    }

    const table = await Table.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!table) {
      return res.status(404).json({ error: 'Không tìm thấy bàn' });
    }

    req.io.emit('table-updated', table);
    res.json(table);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;
    await Table.findByIdAndDelete(id);
    res.json({ message: 'Table deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
