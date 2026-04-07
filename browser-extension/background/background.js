const SERVER_URL = 'http://localhost:3000';
let capturedRequests = [];
let isCapturing = false;
let currentTabId = null;

chrome.runtime.onInstalled.addListener(() => {
  console.log('API助手已安装');
  chrome.storage.local.set({
    capturedRequests: [],
    serverUrl: SERVER_URL,
    isCapturing: false
  });
});

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!isCapturing || details.tabId !== currentTabId) return;
    
    if (details.type === 'xmlhttprequest' || details.type === 'fetch') {
      const requestData = {
        id: details.requestId,
        url: details.url,
        method: details.method,
        type: details.type,
        timestamp: new Date().toISOString(),
        tabId: details.tabId,
        frameId: details.frameId
      };
      
      if (details.requestBody) {
        console.log('请求体类型:', details.type, 'URL:', details.url, 'requestBody:', JSON.stringify(details.requestBody));
        if (details.requestBody.formData) {
          const formData = {};
          for (const [key, value] of Object.entries(details.requestBody.formData)) {
            formData[key] = value.length === 1 ? value[0] : value;
          }
          requestData.body = formData;
          console.log('FormData请求体:', JSON.stringify(formData));
        } else if (details.requestBody.raw && details.requestBody.raw.length > 0) {
          try {
            const decoder = new TextDecoder('utf-8');
            const rawBytes = details.requestBody.raw[0].bytes;
            if (rawBytes) {
              const rawBody = decoder.decode(rawBytes);
              console.log('Raw请求体:', rawBody);
              try {
                requestData.body = JSON.parse(rawBody);
              } catch {
                requestData.body = rawBody;
              }
            }
          } catch (e) {
            console.error('解析Raw请求体失败:', e);
            requestData.body = '[Binary Data]';
          }
        } else if (details.requestBody.error) {
          console.error('请求体错误:', details.requestBody.error);
        }
      } else {
        console.log('无请求体, method:', details.method, 'url:', details.url);
      }
      
      try {
        const urlObj = new URL(details.url);
        const params = {};
        urlObj.searchParams.forEach((value, key) => {
          params[key] = value;
        });
        if (Object.keys(params).length > 0) {
          requestData.params = params;
        }
      } catch (e) {
        console.error('解析URL参数失败:', e);
      }
      
      capturedRequests.push(requestData);
      chrome.storage.local.set({ capturedRequests });
      
      chrome.runtime.sendMessage({
        type: 'REQUEST_CAPTURED',
        data: requestData
      });
    }
  },
  { urls: ['<all_urls>'] },
  ['requestBody', 'extraHeaders']
);

chrome.webRequest.onBeforeSendHeaders.addListener(
  async (details) => {
    if (!isCapturing || details.tabId !== currentTabId) return;
    
    const request = capturedRequests.find(r => r.id === details.requestId);
    if (request) {
      const headers = {};
      if (details.requestHeaders && Array.isArray(details.requestHeaders)) {
        details.requestHeaders.forEach(header => {
          if (header && header.name) {
            headers[header.name] = header.value || '';
          }
        });
      }
      request.headers = headers;
      
      if (headers['Authorization'] || headers['authorization']) {
        const authHeader = headers['Authorization'] || headers['authorization'];
        request.auth = {
          token: authHeader,
          tokenType: authHeader.startsWith('Bearer ') ? 'bearer' : 
                     authHeader.startsWith('Basic ') ? 'basic' : 'custom'
        };
      }
      
      const cookieHeader = headers['Cookie'] || headers['cookie'];
      if (cookieHeader) {
        console.log('从请求头中找到Cookie:', cookieHeader);
        const cookies = [];
        cookieHeader.split(';').forEach(cookieStr => {
          const trimmed = cookieStr.trim();
          if (trimmed) {
            const separatorIndex = trimmed.indexOf('=');
            if (separatorIndex > 0) {
              const name = trimmed.substring(0, separatorIndex).trim();
              const value = trimmed.substring(separatorIndex + 1).trim();
              cookies.push({
                name: name,
                value: value,
                source: 'request-header'
              });
            }
          }
        });
        if (cookies.length > 0) {
          request.cookies = cookies;
          console.log('解析到Cookie数量:', cookies.length);
        }
      }
      
      if (!request.cookies || request.cookies.length === 0) {
        try {
          const browserCookies = await chrome.cookies.getAll({ url: details.url });
          console.log('从浏览器获取到Cookie数量:', browserCookies ? browserCookies.length : 0, 'URL:', details.url);
          if (browserCookies && browserCookies.length > 0) {
            request.cookies = browserCookies.map(c => ({
              name: c.name,
              value: c.value,
              domain: c.domain,
              path: c.path,
              secure: c.secure,
              httpOnly: c.httpOnly,
              expirationDate: c.expirationDate,
              source: 'browser-storage'
            }));
          }
        } catch (e) {
          console.error('获取浏览器Cookie失败:', e, 'URL:', details.url);
        }
      }
      
      chrome.storage.local.set({ capturedRequests });
    }
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders', 'extraHeaders']
);

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (!isCapturing || details.tabId !== currentTabId) return;
    
    const request = capturedRequests.find(r => r.id === details.requestId);
    if (request) {
      request.status = details.statusCode;
      
      if (details.responseHeaders) {
        const responseHeaders = {};
        details.responseHeaders.forEach(header => {
          if (header && header.name) {
            responseHeaders[header.name] = header.value || '';
          }
        });
        request.responseHeaders = responseHeaders;
        
        const setCookie = details.responseHeaders.find(h => h.name.toLowerCase() === 'set-cookie');
        if (setCookie) {
          request.sessionInfo = {
            setCookie: setCookie.value
          };
        }
      }
      
      request.completedAt = new Date().toISOString();
      chrome.storage.local.set({ capturedRequests });
      
      chrome.runtime.sendMessage({
        type: 'REQUEST_COMPLETED',
        data: request
      });
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders', 'extraHeaders']
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'CONTENT_SCRIPT_CAPTURE':
      if (!isCapturing) {
        sendResponse({ success: true, ignored: true });
        break;
      }
      console.log('收到content script捕获:', JSON.stringify(message.data));
      const existingRequest = capturedRequests.find(r => 
        r.url === message.data.url && 
        r.method === message.data.method &&
        Math.abs(new Date(r.timestamp) - new Date(message.data.timestamp)) < 1000
      );
      if (existingRequest) {
        if (message.data.body && !existingRequest.body) {
          existingRequest.body = message.data.body;
          console.log('合并请求体到现有请求:', existingRequest.id);
        }
        if (message.data.headers && Object.keys(message.data.headers).length > 0) {
          existingRequest.contentScriptHeaders = message.data.headers;
        }
        chrome.storage.local.set({ capturedRequests });
      } else {
        console.log('创建新的content script请求:', message.data.url);
        const newRequest = {
          id: 'cs_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          url: message.data.url,
          method: message.data.method,
          headers: message.data.headers || {},
          body: message.data.body,
          type: message.data.type,
          timestamp: message.data.timestamp,
          source: 'content-script'
        };
        capturedRequests.push(newRequest);
        chrome.storage.local.set({ capturedRequests });
        chrome.runtime.sendMessage({
          type: 'REQUEST_CAPTURED',
          data: newRequest
        });
      }
      sendResponse({ success: true });
      break;
      
    case 'START_CAPTURE':
      isCapturing = true;
      currentTabId = message.tabId;
      capturedRequests = [];
      chrome.storage.local.set({ 
        isCapturing: true, 
        capturedRequests: [],
        currentTabId 
      });
      sendResponse({ success: true });
      break;
      
    case 'STOP_CAPTURE':
      isCapturing = false;
      currentTabId = null;
      chrome.storage.local.set({ 
        isCapturing: false,
        currentTabId: null 
      });
      sendResponse({ success: true });
      break;
      
    case 'GET_CAPTURED_REQUESTS':
      chrome.storage.local.get(['capturedRequests'], (result) => {
        sendResponse({ requests: result.capturedRequests || [] });
      });
      return true;
      
    case 'UPLOAD_TO_SERVER':
      uploadToServer(message.data, sendResponse);
      return true;
      
    case 'GET_COOKIES':
      getCookies(message.url, sendResponse);
      return true;
      
    case 'CLEAR_REQUESTS':
      capturedRequests = [];
      chrome.storage.local.set({ capturedRequests: [] });
      sendResponse({ success: true });
      break;
      
    case 'GET_CURRENT_TAB_COOKIES':
      getCurrentTabCookies(sendResponse);
      return true;
  }
});

async function uploadToServer(data, sendResponse) {
  try {
    const response = await fetch(`${SERVER_URL}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    sendResponse({ success: true, data: result });
  } catch (error) {
    console.error('上传到服务器失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function getCookies(url, sendResponse) {
  try {
    const cookies = await chrome.cookies.getAll({ url });
    sendResponse({ success: true, cookies });
  } catch (error) {
    console.error('获取Cookie失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function getCurrentTabCookies(sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const cookies = await chrome.cookies.getAll({ url: tab.url });
      sendResponse({ success: true, cookies, url: tab.url });
    } else {
      sendResponse({ success: false, error: '无法获取当前标签页' });
    }
  } catch (error) {
    console.error('获取当前标签页Cookie失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}
