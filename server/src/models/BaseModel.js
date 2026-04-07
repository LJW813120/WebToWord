const { db } = require('../database/sqlite');
const { v4: uuidv4 } = require('uuid');

class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
  }

  generateId() {
    return uuidv4();
  }

  jsonParse(str, defaultValue = null) {
    if (!str) return defaultValue;
    try {
      return JSON.parse(str);
    } catch {
      return defaultValue;
    }
  }

  jsonStringify(obj) {
    if (!obj) return null;
    return JSON.stringify(obj);
  }

  findAll(conditions = {}, options = {}) {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params = [];
    const whereClauses = [];

    Object.keys(conditions).forEach(key => {
      whereClauses.push(`${key} = ?`);
      params.push(conditions[key]);
    });

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options.offset) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }

    return db.prepare(sql).all(...params);
  }

  findById(id) {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return null;
    }
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    return db.prepare(sql).get(id);
  }

  findOne(conditions) {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params = [];
    const whereClauses = [];

    Object.keys(conditions).forEach(key => {
      whereClauses.push(`${key} = ?`);
      params.push(conditions[key]);
    });

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' LIMIT 1';

    return db.prepare(sql).get(...params);
  }

  create(data) {
    const id = data.id || this.generateId();
    const keys = ['id', ...Object.keys(data)];
    const placeholders = keys.map(() => '?').join(', ');
    const values = [id, ...Object.values(data)];

    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    db.prepare(sql).run(...values);

    return this.findById(id);
  }

  update(id, data) {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return null;
    }
    const keys = Object.keys(data).filter(key => data[key] !== undefined);
    
    if (keys.length === 0) {
      return this.findById(id);
    }
    
    const setClauses = keys.map(key => `${key} = ?`).join(', ');
    const values = [...keys.map(key => data[key]), id];

    const sql = `UPDATE ${this.tableName} SET ${setClauses} WHERE id = ?`;
    db.prepare(sql).run(...values);

    return this.findById(id);
  }

  delete(id) {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return false;
    }
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = db.prepare(sql).run(id);
    return result.changes > 0;
  }

  count(conditions = {}) {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params = [];
    const whereClauses = [];

    Object.keys(conditions).forEach(key => {
      whereClauses.push(`${key} = ?`);
      params.push(conditions[key]);
    });

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    const result = db.prepare(sql).get(...params);
    return result.count;
  }
}

module.exports = BaseModel;
