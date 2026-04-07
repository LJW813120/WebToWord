let capturedRequests = [];
let isCapturing = false;

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadStoredRequests();
});

function setupEventListeners() {
  document.getElementById('startBtn').addEventListener('click', startCapture);
  document.getElementById('stopBtn').addEventListener('click', stopCapture);
  document.getElementById('clearBtn').addEventListener('click', clearRequests);
  document.getElementById('uploadBtn').addEventListener('click', uploadToServer);
  
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'REQUEST_CAPTURED' || message.type === 'REQUEST_COMPLETED') {
      capturedRequests.push(message.data);
      updateUI();
    }
  });
}

async function loadStoredRequests() {
  const data = await chrome.storage.local.get(['capturedRequests', 'isCapturing']);
  capturedRequests = data.capturedRequests || [];
  isCapturing = data.isCapturing || false;
  updateUI();
}

async function startCapture() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.runtime.sendMessage({
    type: 'START_CAPTURE',
    tabId: tab.id
  }, (response) => {
    if (response && response.success) {
      isCapturing = true;
      updateUI();
    }
  });
}

function stopCapture() {
  chrome.runtime.sendMessage({ type: 'STOP_CAPTURE' }, (response) => {
    if (response && response.success) {
      isCapturing = false;
      updateUI();
    }
  });
}

async function clearRequests() {
  capturedRequests = [];
  await chrome.storage.local.set({ capturedRequests: [] });
  updateUI();
}

async function uploadToServer() {
  const data = await chrome.storage.local.get(['serverUrl']);
  const serverUrl = data.serverUrl || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${serverUrl}/api/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: capturedRequests,
        timestamp: new Date().toISOString()
      })
    });
    
    if (response.ok) {
      alert('上传成功');
    }
  } catch (error) {
    alert('上传失败: ' + error.message);
  }
}

function updateUI() {
  document.getElementById('startBtn').disabled = isCapturing;
  document.getElementById('stopBtn').disabled = !isCapturing;
  document.getElementById('uploadBtn').disabled = capturedRequests.length === 0;
  document.getElementById('statusText').textContent = isCapturing ? '捕获中...' : '就绪';
  document.getElementById('countText').textContent = `已捕获: ${capturedRequests.length}`;
  
  renderRequests();
}

function renderRequests() {
  const container = document.getElementById('requestsContainer');
  
  if (capturedRequests.length === 0) {
    container.innerHTML = '<div class="empty-state">点击"开始捕获"开始监控API请求</div>';
    return;
  }
  
  container.innerHTML = capturedRequests.map((req, index) => {
    const methodClass = `method-${req.method.toLowerCase()}`;
    
    return `
      <div class="request-item" data-index="${index}">
        <div>
          <span class="request-method ${methodClass}">${req.method}</span>
          <span class="request-url">${req.url}</span>
        </div>
        <div class="request-details">
          <div class="detail-section">
            <h4>Headers</h4>
            <pre>${JSON.stringify(req.headers || {}, null, 2)}</pre>
          </div>
          ${req.body ? `
          <div class="detail-section">
            <h4>Body</h4>
            <pre>${formatBody(req.body)}</pre>
          </div>
          ` : ''}
          ${req.status ? `
          <div class="detail-section">
            <h4>Response Status</h4>
            <pre>${req.status}</pre>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  container.querySelectorAll('.request-item').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('expanded');
    });
  });
}

function formatBody(body) {
  if (typeof body === 'string') {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  return JSON.stringify(body, null, 2);
}
