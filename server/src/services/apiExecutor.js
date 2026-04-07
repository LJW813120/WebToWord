const axios = require('axios');
const logger = require('../utils/logger');

class ApiExecutor {
  constructor() {
    this.defaultTimeout = 30000;
  }

  async execute(apiConfig, options = {}) {
    const startTime = Date.now();
    const result = {
      apiId: apiConfig._id || apiConfig.id,
      name: apiConfig.name,
      url: apiConfig.url,
      method: apiConfig.method,
      success: false,
      status: null,
      data: null,
      error: null,
      duration: 0,
      timestamp: new Date().toISOString()
    };

    try {
      const config = this.buildRequestConfig(apiConfig, options);
      
      logger.info(`执行API: ${apiConfig.method} ${apiConfig.url}`);
      
      const response = await axios(config);
      
      result.success = true;
      result.status = response.status;
      result.data = response.data;
      result.duration = Date.now() - startTime;
      
      logger.info(`API执行成功: ${apiConfig.name} (${result.duration}ms)`);
      
    } catch (error) {
      result.error = error.message;
      result.duration = Date.now() - startTime;
      
      if (error.response) {
        result.status = error.response.status;
        result.data = error.response.data;
      }
      
      logger.error(`API执行失败: ${apiConfig.name}`, error.message);
    }

    return result;
  }

  buildRequestConfig(apiConfig, options) {
    const config = {
      method: apiConfig.method.toLowerCase(),
      url: this.buildUrl(apiConfig.url, apiConfig.params),
      timeout: options.timeout || apiConfig.timeout || this.defaultTimeout,
      headers: {},
      validateStatus: (status) => status < 500
    };

    if (apiConfig.headers && apiConfig.headers instanceof Map) {
      apiConfig.headers.forEach((value, key) => {
        config.headers[key] = value;
      });
    } else if (apiConfig.headers && typeof apiConfig.headers === 'object') {
      config.headers = { ...apiConfig.headers };
    }

    this.addAuthHeaders(config, apiConfig.auth);

    if (options.cookies && options.cookies.length > 0) {
      const cookieString = options.cookies
        .map(c => `${c.name}=${c.value}`)
        .join('; ');
      config.headers['Cookie'] = cookieString;
    }

    if (['POST', 'PUT', 'PATCH'].includes(apiConfig.method.toUpperCase())) {
      if (apiConfig.body) {
        const contentType = config.headers['Content-Type'] || config.headers['content-type'] || '';
        
        if (contentType.includes('application/x-www-form-urlencoded')) {
          if (typeof apiConfig.body === 'object' && !Array.isArray(apiConfig.body)) {
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(apiConfig.body)) {
              params.append(key, value);
            }
            config.data = params.toString();
          } else {
            config.data = apiConfig.body;
          }
        } else if (typeof apiConfig.body === 'string') {
          try {
            config.data = JSON.parse(apiConfig.body);
            if (!contentType) {
              config.headers['Content-Type'] = 'application/json';
            }
          } catch {
            config.data = apiConfig.body;
          }
        } else {
          config.data = apiConfig.body;
          if (!contentType) {
            config.headers['Content-Type'] = 'application/json';
          }
        }
      }
    }

    if (options.headers) {
      config.headers = { ...config.headers, ...options.headers };
    }

    return config;
  }

  buildUrl(baseUrl, params) {
    if (!params || Object.keys(params).length === 0) {
      return baseUrl;
    }

    const url = new URL(baseUrl);
    
    if (params instanceof Map) {
      params.forEach((value, key) => {
        url.searchParams.append(key, value);
      });
    } else {
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });
    }

    return url.toString();
  }

  addAuthHeaders(config, auth) {
    if (!auth) return;

    if (auth.token) {
      const tokenType = auth.tokenType || 'bearer';
      if (tokenType === 'bearer') {
        config.headers['Authorization'] = `Bearer ${auth.token}`;
      } else if (tokenType === 'basic') {
        config.headers['Authorization'] = `Basic ${auth.token}`;
      } else {
        config.headers['Authorization'] = auth.token;
      }
    }

    if (auth.cookies && auth.cookies.length > 0) {
      const cookieString = auth.cookies
        .map(c => `${c.name}=${c.value}`)
        .join('; ');
      config.headers['Cookie'] = cookieString;
    }
  }

  async executeBatch(apiConfigs, options = {}) {
    const results = [];
    
    for (const apiConfig of apiConfigs) {
      if (options.sequential) {
        const result = await this.execute(apiConfig, options);
        results.push(result);
        
        if (!result.success && options.stopOnError) {
          break;
        }
        
        if (options.delay) {
          await this.delay(options.delay);
        }
      } else {
        const promise = this.execute(apiConfig, options);
        results.push(promise);
      }
    }

    if (!options.sequential) {
      return Promise.all(results);
    }

    return results;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async executeWithRetry(apiConfig, maxRetries = 3, options = {}) {
    let lastError = null;
    
    for (let i = 0; i < maxRetries; i++) {
      const result = await this.execute(apiConfig, options);
      
      if (result.success) {
        return result;
      }
      
      lastError = result.error;
      
      if (i < maxRetries - 1) {
        const delayMs = Math.pow(2, i) * 1000;
        logger.info(`重试 ${i + 1}/${maxRetries}, 等待 ${delayMs}ms`);
        await this.delay(delayMs);
      }
    }

    return {
      success: false,
      error: lastError,
      retries: maxRetries
    };
  }
}

module.exports = new ApiExecutor();
