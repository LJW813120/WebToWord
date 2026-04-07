let capturedRequests = [];
let selectedRequests = new Set();
let isCapturing = false;
let currentTabId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadStoredData();
  setupEventListeners();
  updateUI();
});

async function loadStoredData() {
  const data = await chrome.storage.local.get([
    'capturedRequests',
    'serverUrl',
    'isCapturing',
    'currentTabId'
  ]);
  
  capturedRequests = data.capturedRequests || [];
  const serverUrl = data.serverUrl || 'http://localhost:3000';
  isCapturing = data.isCapturing || false;
  currentTabId = data.currentTabId;
  
  document.getElementById('serverUrl').value = serverUrl;
  
  if (isCapturing) {
    document.getElementById('status').textContent = '捕获中...';
  }
}

function setupEventListeners() {
  document.getElementById('startCapture').addEventListener('click', startCapture);
  document.getElementById('stopCapture').addEventListener('click', stopCapture);
  document.getElementById('clearRequests').addEventListener('click', clearRequests);
  document.getElementById('testConnection').addEventListener('click', testConnection);
  document.getElementById('uploadSelected').addEventListener('click', uploadSelected);
  document.getElementById('uploadAll').addEventListener('click', uploadAll);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  
  document.getElementById('detailModal').addEventListener('click', (e) => {
    if (e.target.id === 'detailModal') {
      closeModal();
    }
  });
  
  document.getElementById('filterUrl').addEventListener('input', filterRequests);
  document.getElementById('filterMethod').addEventListener('change', filterRequests);
  
  document.getElementById('serverUrl').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ serverUrl: e.target.value });
  });
  
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'REQUEST_CAPTURED') {
      capturedRequests.push(message.data);
      chrome.storage.local.set({ capturedRequests });
      updateUI();
    } else if (message.type === 'REQUEST_COMPLETED') {
      const index = capturedRequests.findIndex(r => r.id === message.data.id);
      if (index !== -1) {
        capturedRequests[index] = message.data;
        chrome.storage.local.set({ capturedRequests });
        updateUI();
      }
    }
  });
}

async function startCapture() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab.id;
  
  chrome.runtime.sendMessage({
    type: 'START_CAPTURE',
    tabId: currentTabId
  }, (response) => {
    if (response && response.success) {
      isCapturing = true;
      document.getElementById('status').textContent = '捕获中...';
      updateUI();
    }
  });
}

async function stopCapture() {
  chrome.runtime.sendMessage({ type: 'STOP_CAPTURE' }, (response) => {
    if (response && response.success) {
      isCapturing = false;
      currentTabId = null;
      document.getElementById('status').textContent = '已停止';
      updateUI();
    }
  });
}

async function clearRequests() {
  capturedRequests = [];
  selectedRequests.clear();
  await chrome.storage.local.set({ capturedRequests: [] });
  chrome.runtime.sendMessage({ type: 'CLEAR_REQUESTS' });
  updateUI();
}

async function testConnection() {
  const serverUrl = document.getElementById('serverUrl').value;
  const statusEl = document.getElementById('connectionStatus');
  
  try {
    const response = await fetch(`${serverUrl}/api/health`, {
      method: 'GET'
    });
    
    if (response.ok) {
      statusEl.textContent = '● 已连接';
      statusEl.className = 'connected';
    } else {
      throw new Error('连接失败');
    }
  } catch (error) {
    statusEl.textContent = '● 连接失败';
    statusEl.className = 'disconnected';
  }
}

async function uploadSelected() {
  const requests = capturedRequests.filter(r => selectedRequests.has(r.id));
  await uploadToServer(requests);
}

async function uploadAll() {
  await uploadToServer(capturedRequests);
}

async function uploadToServer(requests) {
  const serverUrl = document.getElementById('serverUrl').value;
  
  console.log('准备上传的请求数量:', requests.length);
  requests.forEach((r, i) => {
    console.log(`请求${i}:`, r.method, r.url, 'body:', r.body ? JSON.stringify(r.body).substring(0, 100) : '无');
  });
  
  try {
    const response = await fetch(`${serverUrl}/api/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: requests,
        timestamp: new Date().toISOString(),
        source: 'browser-extension'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert(`成功上传 ${requests.length} 个请求到服务器`);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    alert(`上传失败: ${error.message}`);
  }
}

function filterRequests() {
  const filterUrl = document.getElementById('filterUrl').value.toLowerCase();
  const filterMethod = document.getElementById('filterMethod').value;
  
  const filtered = capturedRequests.filter(request => {
    const urlMatch = !filterUrl || request.url.toLowerCase().includes(filterUrl);
    const methodMatch = !filterMethod || request.method === filterMethod;
    return urlMatch && methodMatch;
  });
  
  renderRequests(filtered);
}

function updateUI() {
  document.getElementById('requestCount').textContent = capturedRequests.length;
  
  document.getElementById('startCapture').disabled = isCapturing;
  document.getElementById('stopCapture').disabled = !isCapturing;
  document.getElementById('uploadSelected').disabled = selectedRequests.size === 0;
  document.getElementById('uploadAll').disabled = capturedRequests.length === 0;
  
  filterRequests();
}

function renderRequests(requests) {
  const container = document.getElementById('requestsList');
  
  if (requests.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无捕获的请求</div>';
    return;
  }
  
  container.innerHTML = requests.map(request => {
    const methodClass = `method-${request.method.toLowerCase()}`;
    const statusClass = getStatusClass(request.status);
    const selectedClass = selectedRequests.has(request.id) ? 'selected' : '';
    
    const hasDetails = request.headers || request.body || request.params || request.cookies;
    
    return `
      <div class="request-item ${selectedClass}" data-id="${request.id}">
        <div class="request-header">
          <div style="display: flex; align-items: center;">
            <input type="checkbox" class="checkbox" 
              ${selectedRequests.has(request.id) ? 'checked' : ''} 
              data-id="${request.id}">
            <span class="request-method ${methodClass}">${request.method}</span>
            <span class="request-url" title="${request.url}">${truncateUrl(request.url)}</span>
            ${hasDetails ? '<span class="detail-indicator">详情</span>' : ''}
          </div>
          ${request.status ? `<span class="request-status ${statusClass}">${request.status}</span>` : ''}
        </div>
        <div class="request-time">${formatTime(request.timestamp)}</div>
      </div>
    `;
  }).join('');
  
  container.querySelectorAll('.request-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('checkbox')) {
        return;
      }
      const request = requests.find(r => r.id === item.dataset.id);
      if (request) {
        showRequestDetail(request);
      }
    });
  });
  
  container.querySelectorAll('.checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      toggleRequestSelection(checkbox.dataset.id);
    });
  });
}

function showRequestDetail(request) {
  const modal = document.getElementById('detailModal');
  const modalBody = document.getElementById('modalBody');
  
  let html = `
    <div class="detail-section">
      <h4>基本信息</h4>
      <div class="detail-content">
URL: ${request.url}
Method: ${request.method}
Status: ${request.status || 'Pending'}
Time: ${request.timestamp}
      </div>
    </div>
  `;
  
  if (request.params && Object.keys(request.params).length > 0) {
    html += `
      <div class="detail-section">
        <h4>URL参数</h4>
        <div class="detail-content">
          ${Object.entries(request.params).map(([key, value]) => 
            `<div class="param-item"><span class="item-name">${key}:</span><span class="item-value">${value}</span></div>`
          ).join('')}
        </div>
      </div>
    `;
  }
  
  if (request.headers) {
    let headersObj = request.headers;
    
    if (Array.isArray(request.headers)) {
      headersObj = {};
      request.headers.forEach((h, index) => {
        if (h && h.name && h.value !== undefined) {
          headersObj[h.name] = h.value;
        } else if (typeof h === 'object') {
          headersObj[`Header${index}`] = JSON.stringify(h);
        }
      });
    }
    
    if (Object.keys(headersObj).length > 0) {
      html += `
        <div class="detail-section">
          <h4>请求头 (${Object.keys(headersObj).length})</h4>
          <div class="detail-content">
            ${Object.entries(headersObj).map(([key, value]) => 
              `<div class="header-item"><span class="item-name">${key}:</span><span class="item-value">${value}</span></div>`
            ).join('')}
          </div>
        </div>
      `;
    }
  }
  
  if (request.body) {
    const bodyStr = typeof request.body === 'object' ? JSON.stringify(request.body, null, 2) : request.body;
    html += `
      <div class="detail-section">
        <h4>请求体</h4>
        <div class="detail-content">${bodyStr}</div>
      </div>
    `;
  }
  
  if (request.cookies && request.cookies.length > 0) {
    html += `
      <div class="detail-section">
        <h4>Cookies (${request.cookies.length})</h4>
        <div class="detail-content">
          ${request.cookies.map(c => 
            `<div class="cookie-item"><span class="item-name">${c.name}:</span><span class="item-value">${c.value}</span></div>`
          ).join('')}
        </div>
      </div>
    `;
  }
  
  if (request.auth) {
    html += `
      <div class="detail-section">
        <h4>认证信息</h4>
        <div class="detail-content">
Token Type: ${request.auth.tokenType}
Token: ${request.auth.token}
        </div>
      </div>
    `;
  }
  
  if (request.responseHeaders) {
    let responseHeadersObj = request.responseHeaders;
    
    if (Array.isArray(request.responseHeaders)) {
      responseHeadersObj = {};
      request.responseHeaders.forEach((h, index) => {
        if (h && h.name && h.value !== undefined) {
          responseHeadersObj[h.name] = h.value;
        } else if (typeof h === 'object') {
          responseHeadersObj[`Header${index}`] = JSON.stringify(h);
        }
      });
    }
    
    if (Object.keys(responseHeadersObj).length > 0) {
      html += `
        <div class="detail-section">
          <h4>响应头</h4>
          <div class="detail-content">
            ${Object.entries(responseHeadersObj).map(([key, value]) => 
              `<div class="header-item"><span class="item-name">${key}:</span><span class="item-value">${value}</span></div>`
            ).join('')}
          </div>
        </div>
      `;
    }
  }
  
  if (request.sessionInfo) {
    html += `
      <div class="detail-section">
        <h4>Session信息</h4>
        <div class="detail-content">${request.sessionInfo.setCookie}</div>
      </div>
    `;
  }
  
  modalBody.innerHTML = html;
  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('detailModal').classList.remove('active');
}

function toggleRequestSelection(id) {
  if (selectedRequests.has(id)) {
    selectedRequests.delete(id);
  } else {
    selectedRequests.add(id);
  }
  updateUI();
}

function getStatusClass(status) {
  if (!status) return 'status-pending';
  if (status >= 200 && status < 300) return 'status-success';
  return 'status-error';
}

function truncateUrl(url) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname + urlObj.search;
    return path.length > 60 ? path.substring(0, 60) + '...' : path;
  } catch {
    return url.length > 60 ? url.substring(0, 60) + '...' : url;
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}
