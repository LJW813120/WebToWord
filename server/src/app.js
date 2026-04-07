require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const { initDatabase } = require('./database/sqlite');

const apiRoutes = require('./routes/apiRoutes');
const taskRoutes = require('./routes/taskRoutes');
const docRoutes = require('./routes/docRoutes');
const reportTemplateRoutes = require('./routes/reportTemplateRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static(path.join(__dirname, '../web-ui/dist')));

const dirs = [
  process.env.UPLOAD_DIR || './uploads',
  process.env.OUTPUT_DIR || './outputs'
];

dirs.forEach(dir => {
  const fullPath = path.isAbsolute(dir) ? dir : path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    logger.info(`创建目录: ${fullPath}`);
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api', apiRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/docs', docRoutes);
app.use('/api/report-templates', reportTemplateRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../web-ui/dist/index.html'));
});

app.use((err, req, res, next) => {
  logger.error('错误:', err);
  res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误'
  });
});

function initDB() {
  try {
    initDatabase();
    logger.info('SQLite数据库初始化成功');
  } catch (error) {
    logger.error('SQLite数据库初始化失败:', error);
    process.exit(1);
  }
}

async function startServer() {
  initDB();
  
  app.listen(PORT, () => {
    logger.info(`服务器运行在 http://localhost:${PORT}`);
    logger.info(`环境: ${process.env.NODE_ENV}`);
    logger.info(`数据库: SQLite (data/webapi_auto.db)`);
  });
}

startServer();

module.exports = app;
