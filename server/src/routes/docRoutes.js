const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const htmlToWord = require('../services/htmlToWord');
const logger = require('../utils/logger');

const outputDirConfig = process.env.OUTPUT_DIR || './outputs';
const outputDir = path.isAbsolute(outputDirConfig) 
  ? outputDirConfig 
  : path.join(__dirname, '../../..', outputDirConfig);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

router.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(outputDir, filename);

    logger.info(`下载文件请求: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      logger.warn(`文件不存在: ${filePath}`);
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }

    res.download(filePath);
  } catch (error) {
    logger.error('下载文件失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/list', async (req, res) => {
  try {
    const files = fs.readdirSync(outputDir)
      .filter(f => f.endsWith('.docx'))
      .map(f => {
        const stat = fs.statSync(path.join(outputDir, f));
        return {
          filename: f,
          size: stat.size,
          createdAt: stat.birthtime
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    logger.error('获取文档列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(outputDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: '文件已删除'
    });
  } catch (error) {
    logger.error('删除文件失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
