const BaseModel = require('./BaseModel');

class TaskModel extends BaseModel {
  constructor() {
    super('tasks');
  }

  create(data) {
    const processedData = {
      name: data.name,
      description: data.description || '',
      apis: this.jsonStringify(data.apis),
      schedule: this.jsonStringify(data.schedule),
      reportTemplate: data.reportTemplate || data.template,
      outputConfig: this.jsonStringify(data.outputConfig)
    };

    return super.create(processedData);
  }

  update(id, data) {
    const processedData = {};
    
    if (data.name !== undefined) processedData.name = data.name;
    if (data.description !== undefined) processedData.description = data.description;
    if (data.apis !== undefined) processedData.apis = this.jsonStringify(data.apis);
    if (data.schedule !== undefined) processedData.schedule = this.jsonStringify(data.schedule);
    if (data.reportTemplate !== undefined) processedData.reportTemplate = data.reportTemplate;
    if (data.template !== undefined && data.reportTemplate === undefined) processedData.reportTemplate = data.template;
    if (data.outputConfig !== undefined) processedData.outputConfig = this.jsonStringify(data.outputConfig);
    if (data.lastRunAt !== undefined) processedData.lastRunAt = data.lastRunAt;
    if (data.lastRunStatus !== undefined) processedData.lastRunStatus = data.lastRunStatus;
    if (data.lastRunResult !== undefined) processedData.lastRunResult = this.jsonStringify(data.lastRunResult);
    if (data.runHistory !== undefined) processedData.runHistory = this.jsonStringify(data.runHistory);
    
    processedData.updatedAt = new Date().toISOString();

    return super.update(id, processedData);
  }

  findById(id) {
    const row = super.findById(id);
    if (!row) return null;

    return this.processRow(row);
  }

  findAll(conditions = {}, options = {}) {
    const rows = super.findAll(conditions, options);
    return rows.map(row => this.processRow(row));
  }

  processRow(row) {
    return {
      _id: row.id,
      name: row.name,
      description: row.description,
      apis: this.jsonParse(row.apis, []),
      schedule: this.jsonParse(row.schedule, {}),
      reportTemplate: row.reportTemplate,
      outputConfig: this.jsonParse(row.outputConfig, {}),
      lastRunAt: row.lastRunAt,
      lastRunStatus: row.lastRunStatus,
      lastRunResult: this.jsonParse(row.lastRunResult),
      runHistory: this.jsonParse(row.runHistory, []),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  addRunHistory(id, historyEntry) {
    const task = this.findById(id);
    if (!task) return null;

    const history = task.runHistory || [];
    history.push(historyEntry);
    
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }

    return this.update(id, { runHistory: history });
  }
}

module.exports = new TaskModel();
