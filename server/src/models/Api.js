const mongoose = require('mongoose');
const { Schema } = mongoose;

const ApiSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  url: {
    type: String,
    required: true
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    required: true
  },
  headers: {
    type: Map,
    of: String,
    default: {}
  },
  body: {
    type: Schema.Types.Mixed,
    default: null
  },
  params: {
    type: Map,
    of: String,
    default: {}
  },
  auth: {
    type: {
      cookies: [{
        name: String,
        value: String,
        domain: String,
        path: String
      }],
      token: String,
      tokenType: {
        type: String,
        enum: ['bearer', 'basic', 'custom']
      }
    },
    default: {}
  },
  source: {
    type: String,
    enum: ['browser-extension', 'manual', 'import'],
    default: 'browser-extension'
  },
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    default: 'default'
  },
  lastExecutedAt: {
    type: Date
  },
  lastResponseStatus: {
    type: Number
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

ApiSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

ApiSchema.index({ name: 'text', url: 'text', description: 'text' });
ApiSchema.index({ category: 1 });
ApiSchema.index({ tags: 1 });

module.exports = mongoose.model('Api', ApiSchema);
