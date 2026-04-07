const express = require('express');
const router = express.Router();
const ReportTemplate = require('../models/ReportTemplateSqlite');
const htmlToWord = require('../services/htmlToWord');
const logger = require('../utils/logger');

router.get('/', (req, res) => {
  try {
    const { category, limit = 100 } = req.query;
    const conditions = {};
    
    if (category) conditions.category = category;
    
    const templates = ReportTemplate.findAll(conditions, { limit: parseInt(limit) });
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error('获取报告模板列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:id', (req, res) => {
  try {
    const template = ReportTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: '模板不存在'
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('获取报告模板详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, description, htmlContent, cssContent, category, isDefault } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: '模板名称不能为空'
      });
    }
    
    const template = ReportTemplate.create({
      name,
      description,
      htmlContent,
      cssContent,
      category,
      isDefault
    });
    
    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('创建报告模板失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name, description, htmlContent, cssContent, category, isDefault } = req.body;
    
    const template = ReportTemplate.update(req.params.id, {
      name,
      description,
      htmlContent,
      cssContent,
      category,
      isDefault
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: '模板不存在'
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('更新报告模板失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const success = ReportTemplate.delete(req.params.id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: '模板不存在'
      });
    }
    
    res.json({
      success: true,
      message: '模板已删除'
    });
  } catch (error) {
    logger.error('删除报告模板失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:id/duplicate', (req, res) => {
  try {
    const template = ReportTemplate.duplicateTemplate(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: '模板不存在'
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('复制报告模板失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:id/preview', async (req, res) => {
  try {
    const template = ReportTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: '模板不存在'
      });
    }
    
    const { sampleData } = req.body;
    
    const htmlContent = htmlToWord.replacePlaceholders(
      template.htmlContent, 
      sampleData || { taskName: '示例任务', startTime: new Date().toISOString() }
    );
    
    res.json({
      success: true,
      data: {
        html: htmlContent,
        css: template.cssContent
      }
    });
  } catch (error) {
    logger.error('预览报告模板失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const { templateId, data } = req.body;
    
    const template = templateId ? ReportTemplate.findById(templateId) : null;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `report-${timestamp}.docx`;
    
    const result = await htmlToWord.generateInspectionReport(
      data,
      template
    );
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          path: result.path,
          filename: require('path').basename(result.path)
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('生成报告失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
