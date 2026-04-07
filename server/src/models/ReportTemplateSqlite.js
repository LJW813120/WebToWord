const BaseModel = require('./BaseModel');
const { db } = require('../database/sqlite');

class ReportTemplateModel extends BaseModel {
  constructor() {
    super('report_templates');
  }

  create(data) {
    const processedData = {
      name: data.name,
      description: data.description || '',
      htmlContent: data.htmlContent || '',
      cssContent: data.cssContent || '',
      category: data.category || 'default',
      isDefault: data.isDefault ? 1 : 0
    };

    return super.create(processedData);
  }

  update(id, data) {
    const processedData = {};
    
    if (data.name !== undefined) processedData.name = data.name;
    if (data.description !== undefined) processedData.description = data.description;
    if (data.htmlContent !== undefined) processedData.htmlContent = data.htmlContent;
    if (data.cssContent !== undefined) processedData.cssContent = data.cssContent;
    if (data.category !== undefined) processedData.category = data.category;
    if (data.isDefault !== undefined) processedData.isDefault = data.isDefault ? 1 : 0;
    
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
      htmlContent: row.htmlContent,
      cssContent: row.cssContent,
      category: row.category,
      isDefault: row.isDefault === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  getDefaultTemplate() {
    const rows = this.findAll({ isDefault: 1 }, { limit: 1 });
    return rows.length > 0 ? rows[0] : null;
  }

  getByCategory(category) {
    return this.findAll({ category });
  }

  duplicateTemplate(id) {
    const original = this.findById(id);
    if (!original) return null;

    return this.create({
      name: `${original.name} (副本)`,
      description: original.description,
      htmlContent: original.htmlContent,
      cssContent: original.cssContent,
      category: original.category,
      isDefault: false
    });
  }
}

module.exports = new ReportTemplateModel();
