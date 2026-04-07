const BaseModel = require('./BaseModel');
const { db } = require('../database/sqlite');

class ApiModel extends BaseModel {
  constructor() {
    super('apis');
  }

  create(data) {
    const processedData = {
      name: data.name,
      description: data.description || '',
      url: data.url,
      method: data.method,
      headers: this.jsonStringify(data.headers),
      body: this.jsonStringify(data.body),
      params: this.jsonStringify(data.params),
      cookies: this.jsonStringify(data.cookies),
      auth: this.jsonStringify(data.auth),
      source: data.source || 'browser-extension',
      tags: this.jsonStringify(data.tags),
      category: data.category || 'default'
    };

    return super.create(processedData);
  }

  update(id, data) {
    const processedData = {};
    
    if (data.name !== undefined) processedData.name = data.name;
    if (data.description !== undefined) processedData.description = data.description;
    if (data.url !== undefined) processedData.url = data.url;    if (data.method !== undefined) processedData.method = data.method;
    if (data.headers !== undefined) processedData.headers = this.jsonStringify(data.headers);    if (data.body !== undefined) processedData.body = this.jsonStringify(data.body);    if (data.params !== undefined) processedData.params = this.jsonStringify(data.params);    if (data.cookies !== undefined) processedData.cookies = this.jsonStringify(data.cookies);    if (data.auth !== undefined) processedData.auth = this.jsonStringify(data.auth);    if (data.source !== undefined) processedData.source = data.source;    if (data.tags !== undefined) processedData.tags = this.jsonStringify(data.tags);    if (data.category !== undefined) processedData.category = data.category;    if (data.lastExecutedAt !== undefined) processedData.lastExecutedAt = data.lastExecutedAt;    if (data.lastResponseStatus !== undefined) processedData.lastResponseStatus = data.lastResponseStatus;
    
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
      url: row.url,
      method: row.method,
      headers: this.jsonParse(row.headers, {}),
      body: this.jsonParse(row.body),
      params: this.jsonParse(row.params, {}),
      cookies: this.jsonParse(row.cookies, []),
      auth: this.jsonParse(row.auth, {}),
      source: row.source,
      tags: this.jsonParse(row.tags, []),
      category: row.category,
      lastExecutedAt: row.lastExecutedAt,
      lastResponseStatus: row.lastResponseStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  search(searchTerm, options = {}) {
    let sql = `SELECT * FROM ${this.tableName} WHERE name LIKE ? OR url LIKE ? OR description LIKE ?`;
    const params = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];

    if (options.category) {
      sql += ' AND category = ?';
      params.push(options.category);
    }

    sql += ' ORDER BY createdAt DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }

    const rows = db.prepare(sql).all(...params);
    return rows.map(row => this.processRow(row));
  }

  getDistinctCategories() {
    const sql = `SELECT DISTINCT category FROM ${this.tableName}`;
    const rows = db.prepare(sql).all();
    return rows.map(row => row.category);
  }

  getDistinctTags() {
    const sql = `SELECT DISTINCT tags FROM ${this.tableName} WHERE tags IS NOT NULL`;
    const rows = db.prepare(sql).all();
    const tags = new Set();
    
    rows.forEach(row => {
      const parsed = this.jsonParse(row.tags, []);
      parsed.forEach(tag => tags.add(tag));
    });

    return Array.from(tags);
  }
}

module.exports = new ApiModel();
