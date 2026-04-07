const express = require('express');
const router = express.Router();
const Task = require('../models/TaskSqlite');
const Api = require('../models/ApiSqlite');
const ReportTemplate = require('../models/ReportTemplateSqlite');
const apiExecutor = require('../services/apiExecutor');
const htmlToWord = require('../services/htmlToWord');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    const offset = (page - 1) * limit;
    const conditions = {};
    if (status) conditions.lastRunStatus = status;

    const tasks = Task.findAll(conditions, {
      orderBy: 'createdAt DESC',
      limit: parseInt(limit),
      offset
    });
    const total = Task.count(conditions);

    tasks.forEach(task => {
      if (task.apis) {
        task.apis = task.apis.map(apiConfig => {
          if (apiConfig.api && typeof apiConfig.api === 'string') {
            apiConfig.api = Api.findById(apiConfig.api);
          }
          return apiConfig;
        });
      }
      if (task.reportTemplate) {
        task.reportTemplate = ReportTemplate.findById(task.reportTemplate);
      }
    });

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('获取任务列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const task = Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    if (task.apis) {
      task.apis = task.apis.map(apiConfig => {
        if (apiConfig.api && typeof apiConfig.api === 'string') {
          apiConfig.api = Api.findById(apiConfig.api);
        }
        return apiConfig;
      });
    }
    if (task.reportTemplate) {
      task.reportTemplate = ReportTemplate.findById(task.reportTemplate);
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('获取任务详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const task = Task.create(req.body);

    logger.info(`创建任务: ${task.name}`);
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('创建任务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const task = Task.update(req.params.id, req.body);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    if (task.apis) {
      task.apis = task.apis.map(apiConfig => {
        if (apiConfig.api && typeof apiConfig.api === 'string') {
          apiConfig.api = Api.findById(apiConfig.api);
        }
        return apiConfig;
      });
    }
    if (task.reportTemplate) {
      task.reportTemplate = ReportTemplate.findById(task.reportTemplate);
    }

    logger.info(`更新任务: ${task.name}`);
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('更新任务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = Task.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    logger.info(`删除任务: ${req.params.id}`);
    
    res.json({
      success: true,
      message: '任务已删除'
    });
  } catch (error) {
    logger.error('删除任务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:id/run', async (req, res) => {
  try {
    const task = Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    Task.update(req.params.id, {
      lastRunStatus: 'running',
      lastRunAt: new Date().toISOString()
    });

    const startTime = Date.now();
    const results = [];

    for (const apiConfig of task.apis) {
      if (apiConfig.enabled === false) continue;

      let api = null;
      if (typeof apiConfig.api === 'string') {
        api = Api.findById(apiConfig.api);
      } else if (typeof apiConfig.api === 'object' && apiConfig.api !== null) {
        api = apiConfig.api;
      }
      
      if (!api) {
        logger.warn(`API配置无效: ${JSON.stringify(apiConfig.api)}`);
        continue;
      }

      let result;

      if (apiConfig.retryCount > 0) {
        result = await apiExecutor.executeWithRetry(
          api,
          apiConfig.retryCount,
          { timeout: apiConfig.timeout }
        );
      } else {
        result = await apiExecutor.execute(api, {
          timeout: apiConfig.timeout
        });
      }

      results.push(result);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    let status = 'success';
    if (failCount === results.length) {
      status = 'failed';
    } else if (failCount > 0) {
      status = 'partial';
    }

    const taskResult = {
      taskName: task.name,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration,
      status,
      results,
      data: {}
    };

    results.forEach((result, index) => {
      if (result.success && result.data) {
        logger.info(`API结果[${index}]: data类型=${typeof result.data}, isArray=${Array.isArray(result.data)}`);
        logger.info(`API结果[${index}] data内容: ${JSON.stringify(result.data).substring(0, 300)}...`);
        
        taskResult.data[`api${index}`] = result.data;
        if (results.length === 1) {
          if (Array.isArray(result.data) && result.data.length > 0) {
            const firstItem = result.data[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
              Object.assign(taskResult.data, firstItem);
            }
          } else if (typeof result.data === 'object') {
            Object.assign(taskResult.data, result.data);
          }
        }
      }
    });
    
    logger.info(`taskResult.data: ${JSON.stringify(taskResult.data).substring(0, 500)}...`);

    logger.info(`任务模板ID: ${task.reportTemplate}`);
    
    const template = task.reportTemplate ? ReportTemplate.findById(task.reportTemplate) : null;
    logger.info(`模板对象: ${template ? JSON.stringify({ _id: template._id, name: template.name }) : 'null'}`);
    
    const docResult = await htmlToWord.generateInspectionReport(taskResult, template);

    Task.update(req.params.id, {
      lastRunStatus: status,
      lastRunResult: taskResult
    });

    const historyEntry = {
      startedAt: new Date(startTime),
      completedAt: new Date(endTime),
      status,
      results: taskResult,
      outputFiles: docResult.success ? [require('path').basename(docResult.path)] : []
    };

    Task.addRunHistory(req.params.id, historyEntry);

    logger.info(`任务执行完成: ${task.name}, 状态: ${status}`);

    res.json({
      success: true,
      data: {
        status,
        duration,
        successCount,
        failCount,
        results,
        document: docResult
      }
    });
  } catch (error) {
    logger.error('执行任务失败:', error);
    
    try {
      Task.update(req.params.id, { lastRunStatus: 'failed' });
    } catch (e) {
      logger.error('更新任务状态失败:', e);
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:id/preview', async (req, res) => {
  try {
    const task = Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    const previewData = {
      taskName: task.name,
      apis: task.apis.map(a => {
        const api = typeof a.api === 'string' ? Api.findById(a.api) : a.api;
        return {
          name: api?.name,
          url: api?.url,
          method: api?.method
        };
      }),
      reportTemplate: task.reportTemplate ? ReportTemplate.findById(task.reportTemplate) : null
    };

    res.json({
      success: true,
      data: previewData
    });
  } catch (error) {
    logger.error('预览任务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:id/history', async (req, res) => {
  try {
    const task = Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    res.json({
      success: true,
      data: task.runHistory || []
    });
  } catch (error) {
    logger.error('获取任务历史失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:id/execute-api/:apiIndex', async (req, res) => {
  try {
    const task = Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    const apiIndex = parseInt(req.params.apiIndex);
    const apiConfig = task.apis?.[apiIndex];

    if (!apiConfig) {
      return res.status(404).json({
        success: false,
        error: 'API配置不存在'
      });
    }

    let api = null;
    if (typeof apiConfig.api === 'string') {
      api = Api.findById(apiConfig.api);
    } else if (typeof apiConfig.api === 'object' && apiConfig.api !== null) {
      api = apiConfig.api;
    }

    if (!api) {
      return res.status(404).json({
        success: false,
        error: 'API不存在'
      });
    }

    const result = await apiExecutor.execute(api, {
      timeout: apiConfig.timeout || 30000,
      cookies: api.cookies || []
    });

    const fields = extractFieldsFromData(result.data);

    res.json({
      success: true,
      data: {
        apiName: api.name,
        apiMethod: api.method,
        apiUrl: api.url,
        responseStatus: result.status,
        responseData: result.data,
        fields: fields,
        success: result.success,
        error: result.error
      }
    });
  } catch (error) {
    logger.error('执行API失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

function extractFieldsFromData(data, prefix = '', maxDepth = 5) {
  const fields = [];
  
  if (!data || typeof data !== 'object' || maxDepth <= 0) {
    if (data !== null && data !== undefined) {
      fields.push({
        path: prefix || 'value',
        type: typeof data,
        sampleValue: String(data).substring(0, 100)
      });
    }
    return fields;
  }

  if (Array.isArray(data)) {
    if (data.length > 0) {
      const firstItem = data[0];
      if (typeof firstItem === 'object' && firstItem !== null) {
        const itemFields = extractFieldsFromData(firstItem, prefix ? `${prefix}[]` : '[]', maxDepth - 1);
        fields.push(...itemFields);
      } else {
        fields.push({
          path: prefix || 'array',
          type: 'array',
          sampleValue: `[${data.length} items]`,
          itemType: typeof firstItem
        });
      }
    } else {
      fields.push({
        path: prefix || 'array',
        type: 'array',
        sampleValue: '[]'
      });
    }
    return fields;
  }

  for (const key of Object.keys(data)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = data[key];

    if (value === null || value === undefined) {
      fields.push({
        path: fullKey,
        type: 'null',
        sampleValue: null
      });
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        const firstItem = value[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
          fields.push({
            path: fullKey,
            type: 'array',
            sampleValue: `[${value.length} objects]`
          });
          const itemFields = extractFieldsFromData(firstItem, `${fullKey}[]`, maxDepth - 1);
          fields.push(...itemFields);
        } else {
          fields.push({
            path: fullKey,
            type: 'array',
            sampleValue: value.slice(0, 3).map(v => String(v).substring(0, 30)).join(', '),
            itemType: typeof firstItem
          });
        }
      } else {
        fields.push({
          path: fullKey,
          type: 'array',
          sampleValue: '[]'
        });
      }
    } else if (typeof value === 'object') {
      fields.push({
        path: fullKey,
        type: 'object',
        sampleValue: '{...}'
      });
      fields.push(...extractFieldsFromData(value, fullKey, maxDepth - 1));
    } else {
      fields.push({
        path: fullKey,
        type: typeof value,
        sampleValue: String(value).substring(0, 100)
      });
    }
  }

  return fields;
}

module.exports = router;
