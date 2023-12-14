// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { model, Schema } = require("mongoose");

const userSchema  = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
  },
});
const UserModel = mongoose.model('User', userSchema);
module.exports = { UserModel }
