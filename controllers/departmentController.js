const Department = require('../models/Department');

const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ company: req.user.company })
      .populate('manager', 'name phone')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: departments.length,
      data: departments
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('manager', 'name phone');

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    return res.json({ success: true, data: department });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name, description, manager } = req.body;

    const department = await Department.create({
      name,
      description: description || '',
      manager: manager || null,
      company: req.user.company
    });

    return res.status(201).json({
      success: true,
      message: 'Department created',
      data: department
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { name, description, manager, isActive } = req.body;

    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    if (name) department.name = name;
    if (description !== undefined) department.description = description;
    if (manager) department.manager = manager;
    if (isActive !== undefined) department.isActive = isActive;

    await department.save();

    return res.json({
      success: true,
      message: 'Department updated',
      data: department
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    await Department.findByIdAndDelete(req.params.id);

    return res.json({ success: true, message: 'Department deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { getDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment };