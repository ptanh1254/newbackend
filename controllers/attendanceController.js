import Attendance from '../models/Attendance.js';

export const checkIn = async (req, res) => {
  try {
    const staffId = req.body.staffId;
    const today = new Date().setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      staff: staffId,
      date: today
    });

    if (!attendance) {
      attendance = new Attendance({
        staff: staffId,
        checkInTime: new Date(),
        date: today
      });
    } else {
      attendance.checkInTime = new Date();
    }

    await attendance.save();
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const checkOut = async (req, res) => {
  try {
    const staffId = req.body.staffId;
    const today = new Date().setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      staff: staffId,
      date: today
    });

    if (attendance) {
      attendance.checkOutTime = new Date();
      await attendance.save();
    }

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find()
      .populate('staff')
      .sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
