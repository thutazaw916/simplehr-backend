const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['owner', 'hr', 'employee'], default: 'employee' },
  position: { type: String, default: '' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  joinDate: { type: Date, default: Date.now },
  salary: { type: Number, default: 0 },
  nrc: { type: String, default: '' },
  address: { type: String, default: '' },
  bankInfo: {
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    accountName: { type: String, default: '' }
  },
  emergencyContact: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    relation: { type: String, default: '' }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);