const User = require('../models/User');

const normalizePhone = (phone) => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('959')) cleaned = '0' + cleaned.slice(2);
  if (cleaned.startsWith('9') && cleaned.length <= 10) cleaned = '0' + cleaned;
  if (!cleaned.startsWith('0')) cleaned = '0' + cleaned;
  return cleaned;
};

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

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone required' });
    }

    const normalizedPhone = normalizePhone(phone);

    // Check phone format
    if (!/^09\d{7,9}$/.test(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Invalid Myanmar phone number. Must start with 09' });
    }

    // Check uniqueness within company
    const existsInCompany = await User.findOne({ phone: normalizedPhone, company: req.user.company });
    if (existsInCompany) {
      return res.status(400).json({ success: false, message: 'Phone already exists in your company' });
    }

    // Check global uniqueness
    const existsGlobal = await User.findOne({ phone: normalizedPhone });
    if (existsGlobal) {
      return res.status(400).json({ success: false, message: 'Phone already registered in another company' });
    }

    const employee = await User.create({
      name,
      phone: normalizedPhone,
      password: password || '',
      role: role || 'employee',
      position: position || '',
      department: department || null,
      company: req.user.company,
      joinDate: joinDate || new Date(),
      salary: salary || 0,
      nrc: nrc || '',
      address: address || '',
      bankInfo: bankInfo || {},
      emergencyContact: emergencyContact || {},
      accountStatus: 'pending',
      loginMethod: 'otp',
      isActive: true
    });

    return res.status(201).json({
      success: true,
      message: 'Employee added. They can login with OTP.',
      data: { _id: employee._id, name: employee.name, phone: employee.phone, role: employee.role, position: employee.position, accountStatus: employee.accountStatus }
    });
  } catch (error) { return res.status(500).json({ success: false, message: 'Server error', error: error.message }); }
};

const updateEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Not found' });

    const fields = ['name', 'role', 'position', 'isActive', 'joinDate', 'salary', 'nrc', 'address', 'bankInfo', 'emergencyContact', 'accountStatus'];
    fields.forEach(f => { if (req.body[f] !== undefined) employee[f] = req.body[f]; });

    if (req.body.phone) {
      const normalizedPhone = normalizePhone(req.body.phone);
      const exists = await User.findOne({ phone: normalizedPhone, _id: { $ne: employee._id } });
      if (exists) return res.status(400).json({ success: false, message: 'Phone already exists' });
      employee.phone = normalizedPhone;
    }

    if (req.body.department !== undefined) employee.department = req.body.department || null;
    await employee.save();

    return res.json({ success: true, message: 'Updated', data: employee });
  } catch (error) { return res.status(500).json({ success: false, message: 'Server error', error: error.message }); }
};

const deleteEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Not found' });

    // Soft delete
    employee.accountStatus = 'deleted';
    employee.isActive = false;
    await employee.save();

    return res.json({ success: true, message: 'Employee removed' });
  } catch (error) { return res.status(500).json({ success: false, message: 'Server error', error: error.message }); }
};

module.exports = { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee };