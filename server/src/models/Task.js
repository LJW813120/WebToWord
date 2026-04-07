const mongoose = require('mongoose');
const { Schema } = mongoose;

const TaskSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  apis: [{
    api: {
      type: Schema.Types.ObjectId,
      ref: 'Api',
      required: true
    },
    order: {
      type: Number,
      default: 0
    },
    enabled: {
      type: Boolean,
      default: true
    },
    retryCount: {
      type: Number,
      default: 0
    },
    timeout: {
      type: Number,
      default: 30000
    }
  }],
  schedule: {
    enabled: {
      type: Boolean,
      default: false
    },
    cron: {
      type: String,
      default: '0 0 * * *'
    },
    timezone: {
      type: String,
      default: 'Asia/Shanghai'
    }
  },
  template: {
    type: Schema.Types.ObjectId,
    ref: 'Template'
  },
  fieldMappings: [{
    source: {
      type: String,
      required: true
    },
    sourcePath: {
      type: String,
      required: true
    },
    target: {
      type: String,
      required: true
    },
    transform: {
      type: String,
      enum: ['none', 'date', 'number', 'string', 'boolean', 'custom'],
      default: 'none'
    },
    transformFunction: {
      type: String
    }
  }],
  outputConfig: {
    filename: {
      type: String,
      default: 'inspection-report-{timestamp}.docx'
    },
    format: {
      type: String,
      enum: ['docx', 'pdf'],
      default: 'docx'
    },
    saveToCloud: {
      type: Boolean,
      default: false
    }
  },
  lastRunAt: {
    type: Date
  },
  lastRunStatus: {
    type: String,
    enum: ['pending', 'running', 'success', 'failed', 'partial'],
    default: 'pending'
  },
  lastRunResult: {
    type: Schema.Types.Mixed
  },
  runHistory: [{
    startedAt: Date,
    completedAt: Date,
    status: String,
    results: Schema.Types.Mixed,
    outputFiles: [String]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

TaskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

TaskSchema.methods.addRunHistory = function(runData) {
  this.runHistory.push(runData);
  if (this.runHistory.length > 50) {
    this.runHistory = this.runHistory.slice(-50);
  }
  return this.save();
};

module.exports = mongoose.model('Task', TaskSchema);
