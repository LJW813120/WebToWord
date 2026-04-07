const mongoose = require('mongoose');
const { Schema } = mongoose;

const TemplateSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['docx', 'dynamic'],
    required: true
  },
  filePath: {
    type: String
  },
  content: {
    type: Schema.Types.Mixed
  },
  placeholders: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'image', 'table', 'list'],
      default: 'text'
    },
    description: String,
    defaultValue: Schema.Types.Mixed,
    required: {
      type: Boolean,
      default: false
    }
  }],
  styles: {
    type: Schema.Types.Mixed,
    default: {}
  },
  category: {
    type: String,
    default: 'default'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

TemplateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

TemplateSchema.statics.getDefault = function() {
  return this.findOne({ isDefault: true });
};

module.exports = mongoose.model('Template', TemplateSchema);
