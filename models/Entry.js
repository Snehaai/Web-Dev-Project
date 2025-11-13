const mongoose = require('mongoose');

const EntrySchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  mood: { type: Number, required: true, min:1, max:5 },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: false });

module.exports = mongoose.model('Entry', EntrySchema);
