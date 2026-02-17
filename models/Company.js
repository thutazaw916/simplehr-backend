const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'ကုမ္ပဏီအမည်ထည့်ပါ']
  },
  phone: {
    type: String,
    required: [true, 'ဖုန်းနံပါတ်ထည့်ပါ']
  },
  address: {
    type: String,
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Company', companySchema);