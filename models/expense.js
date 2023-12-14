const mongoose = require('mongoose');
const { model, Schema } = require("mongoose")
const ExpenseModel = new Schema({
      name: { type: String, required: true },
      isbn: { type: String, required: true, unique: true },
      category: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      // ... other fields
    });
  
  const Expense = mongoose.model('Exp', ExpenseModel);
module.exports = { Expense }
