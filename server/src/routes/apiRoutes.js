const express = require('express');
const router = express.Router();
const Api = require('../models/ApiSqlite');
const logger = require('../utils/logger');

router.post('/capture', async (req, res) => {
  try {
    const { requests, timestamp, source } = req.body;
    
    console.log('收到上传请求，数量:', requests ? requests.length : 0);
    
    if (!requests || !Array.isArray(requests)) {
      return res.status(400).json({
        success: false,
        error: '请求数据格式错误'
      });
    }

    const savedApis = [];
    
    for (const request of requests) {
      console.log('处理请求:', request.method, request.url, 'body:', request.body ? '有' : '无');
      const api = Api.create({
        name: `${request.method} ${extractPath(request.url)}`,
        url: request.url,
        method: request.method,
        headers: request.headers || {},
        body: request.body,
        params: request.params,
        cookies: request.cookies,
        source: source || 'browser-extension',
        category: 'captured'
      });
      
      savedApis.push(api);
    }

    logger.info(`成功保存 ${savedApis.length} 个API请求`);
    
    res.json({
      success: true,
      count: savedApis.length,
      apis: savedApis
    });
  } catch (error) {
    logger.error('保存API请求失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/apis', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, tag, search } = req.query;
    
    const offset = (page - 1) * limit;
    let apis;
    let total;

    if (search) {
      apis = Api.search(search, { category, limit: parseInt(limit), offset });
      total = Api.search(search, { category }).length;
    } else {
      const conditions = {};
      if (category) conditions.category = category;
      
      apis = Api.findAll(conditions, {
        orderBy: 'createdAt DESC',
        limit: parseInt(limit),
        offset
      });
      total = Api.count(conditions);
    }

    res.json({
      success: true,
      data: apis,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('获取API列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/apis/:id', async (req, res) => {
  try {
    const api = Api.findById(req.params.id);
    
    if (!api) {
      return res.status(404).json({
        success: false,
        error: 'API不存在'
      });
    }

    res.json({
      success: true,
      data: api
    });
  } catch (error) {
    logger.error('获取API详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/apis', async (req, res) => {
  try {
    const api = Api.create(req.body);

    logger.info(`创建API: ${api.name}`);
    
    res.json({
      success: true,
      data: api
    });
  } catch (error) {
    logger.error('创建API失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/apis/:id', async (req, res) => {
  try {
    const api = Api.update(req.params.id, req.body);

    if (!api) {
      return res.status(404).json({
        success: false,
        error: 'API不存在'
      });
    }

    logger.info(`更新API: ${api.name}`);
    
    res.json({
      success: true,
      data: api
    });
  } catch (error) {
    logger.error('更新API失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/apis/:id', async (req, res) => {
  try {
    const deleted = Api.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'API不存在'
      });
    }

    logger.info(`删除API: ${req.params.id}`);
    
    res.json({
      success: true,
      message: 'API已删除'
    });
  } catch (error) {
    logger.error('删除API失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/apis/:id/execute', async (req, res) => {
  try {
    const api = Api.findById(req.params.id);
    
    if (!api) {
      return res.status(404).json({
        success: false,
        error: 'API不存在'
      });
    }

    const apiExecutor = require('../services/apiExecutor');
    const result = await apiExecutor.execute(api, req.body.options || {});

    Api.update(req.params.id, {
      lastExecutedAt: new Date().toISOString(),
      lastResponseStatus: result.status
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('执行API失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = Api.getDistinctCategories();
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('获取分类列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/tags', async (req, res) => {
  try {
    const tags = Api.getDistinctTags();
    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    logger.error('获取标签列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

function extractPath(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    return url;
  }
}

module.exports = router;
