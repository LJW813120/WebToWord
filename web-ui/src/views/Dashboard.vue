<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" :size="40" color="#409eff"><Connection /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalApis }}</div>
              <div class="stat-label">API总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" :size="40" color="#67c23a"><List /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalTasks }}</div>
              <div class="stat-label">巡检任务</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" :size="40" color="#e6a23c"><Document /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalTemplates }}</div>
              <div class="stat-label">文档模板</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" :size="40" color="#f56c6c"><Folder /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalDocuments }}</div>
              <div class="stat-label">生成文档</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最近执行的任务</span>
              <el-button text @click="$router.push('/tasks')">
                查看全部 <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </template>
          
          <el-table :data="recentTasks" style="width: 100%">
            <el-table-column prop="name" label="任务名称" />
            <el-table-column prop="lastRunStatus" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.lastRunStatus)">
                  {{ getStatusText(row.lastRunStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="lastRunAt" label="最后执行" width="180">
              <template #default="{ row }">
                {{ formatDate(row.lastRunAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="runTask(row._id)">
                  执行
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>快速操作</span>
          </template>
          
          <div class="quick-actions">
            <el-button type="primary" class="action-btn" @click="$router.push('/apis')">
              <el-icon><Plus /></el-icon>
              添加API
            </el-button>
            <el-button type="success" class="action-btn" @click="$router.push('/tasks')">
              <el-icon><Plus /></el-icon>
              创建任务
            </el-button>
            <el-button type="warning" class="action-btn" @click="$router.push('/report-templates')">
              <el-icon><Upload /></el-icon>
              创建模板
            </el-button>
            <el-button class="action-btn" @click="showQuickRun = true">
              <el-icon><VideoPlay /></el-icon>
              快速执行
            </el-button>
          </div>
        </el-card>
        
        <el-card style="margin-top: 20px;">
          <template #header>
            <span>系统状态</span>
          </template>
          
          <div class="system-status">
            <div class="status-item">
              <span class="status-label">服务器状态</span>
              <el-tag :type="serverStatus === 'ok' ? 'success' : 'danger'">
                {{ serverStatus === 'ok' ? '正常' : '异常' }}
              </el-tag>
            </div>
            <div class="status-item">
              <span class="status-label">数据库状态</span>
              <el-tag :type="dbStatus === 'connected' ? 'success' : 'danger'">
                {{ dbStatus === 'connected' ? '已连接' : '未连接' }}
              </el-tag>
            </div>
            <div class="status-item">
              <span class="status-label">运行时间</span>
              <span class="status-value">{{ formatUptime(uptime) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { taskService, apiService, reportTemplateService, docService } from '@/services/api'
import { ElMessage } from 'element-plus'

const stats = ref({
  totalApis: 0,
  totalTasks: 0,
  totalTemplates: 0,
  totalDocuments: 0
})

const recentTasks = ref([])
const serverStatus = ref('ok')
const dbStatus = ref('connected')
const uptime = ref(0)
const showQuickRun = ref(false)

onMounted(async () => {
  await loadStats()
  await loadRecentTasks()
  await checkHealth()
})

async function loadStats() {
  try {
    const [apisRes, tasksRes, templatesRes, docsRes] = await Promise.all([
      apiService.getApis({ limit: 1 }),
      taskService.getTasks({ limit: 1 }),
      reportTemplateService.getTemplates({ limit: 1 }),
      docService.getDocuments()
    ])
    
    stats.value = {
      totalApis: apisRes.pagination?.total || 0,
      totalTasks: tasksRes.pagination?.total || 0,
      totalTemplates: templatesRes.pagination?.total || 0,
      totalDocuments: docsRes.data?.length || 0
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

async function loadRecentTasks() {
  try {
    const res = await taskService.getTasks({ limit: 5 })
    recentTasks.value = res.data || []
  } catch (error) {
    console.error('加载最近任务失败:', error)
  }
}

async function checkHealth() {
  try {
    const res = await fetch('/api/health')
    const data = await res.json()
    serverStatus.value = data.status
    uptime.value = data.uptime
    dbStatus.value = 'connected'
  } catch (error) {
    serverStatus.value = 'error'
    dbStatus.value = 'disconnected'
  }
}

async function runTask(id) {
  try {
    ElMessage.info('任务执行中...')
    await taskService.runTask(id)
    ElMessage.success('任务执行成功')
    await loadRecentTasks()
  } catch (error) {
    console.error('执行任务失败:', error)
  }
}

function getStatusType(status) {
  const types = {
    pending: 'info',
    running: 'warning',
    success: 'success',
    failed: 'danger',
    partial: 'warning'
  }
  return types[status] || 'info'
}

function getStatusText(status) {
  const texts = {
    pending: '待执行',
    running: '执行中',
    success: '成功',
    failed: '失败',
    partial: '部分成功'
  }
  return texts[status] || '未知'
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}小时${minutes}分钟`
}
</script>

<style scoped>
.dashboard {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.stat-card {
  border-radius: 8px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-btn {
  width: 100%;
  justify-content: flex-start;
}

.system-status {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label {
  color: #606266;
}

.status-value {
  color: #303133;
  font-weight: 500;
}
</style>
