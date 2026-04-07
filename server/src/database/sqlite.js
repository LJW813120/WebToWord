const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'webapi_auto.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS apis (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      url TEXT NOT NULL,
      method TEXT NOT NULL,
      headers TEXT,
      body TEXT,
      params TEXT,
      cookies TEXT,
      auth TEXT,
      source TEXT DEFAULT 'browser-extension',
      tags TEXT,
      category TEXT DEFAULT 'default',
      lastExecutedAt TEXT,
      lastResponseStatus INTEGER,
      lastResponseData TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      apis TEXT,
      schedule TEXT,
      reportTemplate TEXT,
      outputConfig TEXT,
      lastRunAt TEXT,
      lastRunStatus TEXT DEFAULT 'pending',
      lastRunResult TEXT,
      runHistory TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS report_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      htmlContent TEXT,
      cssContent TEXT,
      category TEXT DEFAULT 'default',
      isDefault INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_apis_category ON apis(category);
    CREATE INDEX IF NOT EXISTS idx_apis_tags ON apis(tags);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(lastRunStatus);
    CREATE INDEX IF NOT EXISTS idx_report_templates_category ON report_templates(category);
  `);

  runMigrations();

  console.log('数据库初始化完成');
}

function runMigrations() {
  try {
    const tableInfo = db.prepare('PRAGMA table_info(apis)').all();
    const columns = tableInfo.map(col => col.name);
    
    if (!columns.includes('cookies')) {
      console.log('添加 cookies 列到 apis 表...');
      db.exec('ALTER TABLE apis ADD COLUMN cookies TEXT');
      console.log('cookies 列添加成功');
    }
    
    if (!columns.includes('params')) {
      console.log('添加 params 列到 apis 表...');
      db.exec('ALTER TABLE apis ADD COLUMN params TEXT');
      console.log('params 列添加成功');
    }

    if (!columns.includes('lastResponseData')) {
      console.log('添加 lastResponseData 列到 apis 表...');
      db.exec('ALTER TABLE apis ADD COLUMN lastResponseData TEXT');
      console.log('lastResponseData 列添加成功');
    }

    try {
      db.exec(`DROP TABLE IF EXISTS templates`);
      db.exec(`DROP TABLE IF EXISTS field_mappings`);
      console.log('已删除旧的模板表');
    } catch (e) {
    }

    try {
      const taskInfo = db.prepare('PRAGMA table_info(tasks)').all();
      const taskColumns = taskInfo.map(col => col.name);
      
      if (taskColumns.includes('template')) {
        console.log('重命名 template 列为 reportTemplate...');
        db.exec(`ALTER TABLE tasks RENAME COLUMN template TO reportTemplate`);
      }
      
      if (taskColumns.includes('fieldMappings')) {
        console.log('删除 fieldMappings 列...');
        db.exec(`CREATE TABLE tasks_new AS SELECT 
          id, name, description, apis, schedule, 
          COALESCE(template, reportTemplate) as reportTemplate,
          outputConfig, lastRunAt, lastRunStatus, lastRunResult, runHistory, 
          createdAt, updatedAt 
          FROM tasks`);
        db.exec(`DROP TABLE tasks`);
        db.exec(`ALTER TABLE tasks_new RENAME TO tasks`);
      }
    } catch (e) {
      console.log('任务表迁移:', e.message);
    }

  } catch (error) {
    console.error('数据库迁移失败:', error);
  }
}

module.exports = {
  db,
  initDatabase
};
