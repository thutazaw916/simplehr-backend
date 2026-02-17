const User = require('../models/User');

// Employee စာရင်းကြည့် (GET /api/employees)
const getEmployees = async (req, res) => {
  try {
    const employees = await User.find({ company: req.user.company })
      .select('-password')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Employee တစ်ယောက်ကြည့် (GET /api/employees/:id)
const getEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id).select('-password');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    return res.json({ success: true, data: employee });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Employee အသစ်ထည့် (POST /api/employees)
const createEmployee = async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;

    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Phone already exists' });
    }

    const employee = await User.create({
      name,
      phone,
      password: password || '123456',
      role: role || 'employee',
      company: req.user.company
    });

    return res.status(201).json({
      success: true,
      message: 'Employee added',
      data: {
        _id: employee._id,
        name: employee.name,
        phone: employee.phone,
        role: employee.role
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Employee ပြင် (PUT /api/employees/:id)
const updateEmployee = async (req, res) => {
  try {
    const { name, phone, role, isActive } = req.body;

    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (name) employee.name = name;
    if (phone) employee.phone = phone;
    if (role) employee.role = role;
    if (isActive !== undefined) employee.isActive = isActive;

    await employee.save();

    return res.json({
      success: true,
      message: 'Employee updated',
      data: {
        _id: employee._id,
        name: employee.name,
        phone: employee.phone,
        role: employee.role,
        isActive: employee.isActive
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Employee ဖျက် (DELETE /api/employees/:id)
const deleteEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    await User.findByIdAndDelete(req.params.id);

    return res.json({ success: true, message: 'Employee deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee };