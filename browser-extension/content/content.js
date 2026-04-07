(function() {
  'use strict';
  
  const originalFetch = window.fetch;
  const originalXHR = window.XMLHttpRequest;
  
  window.fetch = function(...args) {
    const [url, options = {}] = args;
    
    const urlStr = typeof url === 'string' ? url : (url.url || url.toString());
    
    let body = options.body;
    if (body instanceof FormData) {
      const formData = {};
      body.forEach((value, key) => {
        formData[key] = value;
      });
      body = formData;
    } else if (body instanceof URLSearchParams) {
      body = Object.fromEntries(body);
    }
    
    const requestInfo = {
      type: 'fetch',
      url: urlStr,
      method: options.method || 'GET',
      headers: options.headers || {},
      body: body,
      timestamp: new Date().toISOString()
    };
    
    console.log('Content script捕获fetch:', requestInfo.method, requestInfo.url, 'body:', body ? '有' : '无');
    
    chrome.runtime.sendMessage({
      type: 'CONTENT_SCRIPT_CAPTURE',
      data: requestInfo
    }).catch(() => {});
    
    return originalFetch.apply(this, args);
  };
  
  class ProxyXHR extends originalXHR {
    constructor() {
      super();
      this._requestInfo = {};
    }
    
    open(method, url, ...args) {
      this._requestInfo.method = method;
      this._requestInfo.url = url;
      this._requestInfo.timestamp = new Date().toISOString();
      return super.open(method, url, ...args);
    }
    
    setRequestHeader(name, value) {
      if (!this._requestInfo.headers) {
        this._requestInfo.headers = {};
      }
      this._requestInfo.headers[name] = value;
      return super.setRequestHeader(name, value);
    }
    
    send(body) {
      this._requestInfo.body = body;
      this._requestInfo.type = 'xhr';
      
      console.log('Content script捕获XHR:', this._requestInfo.method, this._requestInfo.url, 'body:', body ? '有' : '无');
      
      chrome.runtime.sendMessage({
        type: 'CONTENT_SCRIPT_CAPTURE',
        data: this._requestInfo
      }).catch(() => {});
      
      return super.send(body);
    }
  }
  
  window.XMLHttpRequest = ProxyXHR;
  
  console.log('API助手 - 内容脚本已加载');
})();
