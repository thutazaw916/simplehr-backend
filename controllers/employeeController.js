const User = require('../models/User');

const getEmployees = async (req, res) => {
  try {
    const employees = await User.find({ company: req.user.company }).select('-password').populate('department', 'name').sort({ createdAt: -1 });
    return res.json({ success: true, count: employees.length, data: employees });
  } catch (error) { return res.status(500).json({ success: false, message: 'Server error', error: error.message }); }
};

const getEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id).select('-password').populate('department', 'name');
    if (!employee) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: employee });
  } catch (error) { return res.status(500).json({ success: false, message: 'Server error', error: error.message }); }
};

const createEmployee = async (req, res) => {
  try {
    const { name, phone, password, role, position, department, joinDate, salary, nrc, address, bankInfo, emergencyContact } = req.body;
    const userExists = await User.findOne({ phone });
    if (userExists) return res.status(400).json({ success: false, message: 'Phone already exists' });

    const employee = await User.create({
      name, phone, password: password || '123456', role: role || 'employee',
      position: position || '', department: department || null,
      company: req.user.company, joinDate: joinDate || new Date(),
      salary: salary || 0, nrc: nrc || '', address: address || '',
      bankInfo: bankInfo || {}, emergencyContact: emergencyContact || {}
    });

    return res.status(201).json({ success: true, message: 'Employee added', data: { _id: employee._id, name: employee.name, phone: employee.phone, role: employee.role, position: employee.position, joinDate: employee.joinDate } });
  } catch (error) { return res.status(500).json({ success: false, message: 'Server error', error: error.message }); }
};

const updateEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Not found' });

    const fields = ['name', 'phone', 'role', 'position', 'isActive', 'joinDate', 'salary', 'nrc', 'address', 'bankInfo', 'emergencyContact'];
    fields.forEach(f => { if (req.body[f] !== undefined) employee[f] = req.body[f]; });
    if (req.body.department !== undefined) employee.department = req.body.department || null;
    await employee.save();

    return res.json({ success: true, message: 'Updated', data: employee });
  } catch (error) { return res.status(500).json({ success: false, message: 'Server error', error: error.message }); }
};

const deleteEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Not found' });
    await User.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Deleted' });
  } catch (error) { return res.status(500).json({ success: false, message: 'Server error', error: error.message }); }
};

module.exports = { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee };