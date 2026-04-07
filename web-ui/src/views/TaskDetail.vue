<template>
  <div class="task-detail">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>{{ task?.name || '任务详情' }}</span>
          <div>
            <el-button type="success" @click="runTask">
              <el-icon><VideoPlay /></el-icon>
              执行任务
            </el-button>
            <el-button @click="saveTask">保存</el-button>
          </div>
        </div>
      </template>

      <el-form v-if="task" :model="task" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="任务名称">
              <el-input v-model="task.name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="报告模板">
              <el-select v-model="task.reportTemplate" style="width: 100%" placeholder="选择报告模板">
                <el-option label="使用默认模板" :value="''" />
                <el-option
                  v-for="tpl in templates"
                  :key="tpl._id"
                  :label="tpl.name"
                  :value="tpl._id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="描述">
          <el-input v-model="task.description" type="textarea" :rows="3" />
        </el-form-item>

        <el-divider>API列表</el-divider>

        <el-table :data="task.apis" style="width: 100%">
          <el-table-column prop="api.name" label="API名称" min-width="200" />
          <el-table-column prop="api.method" label="方法" width="100" />
          <el-table-column prop="enabled" label="启用" width="100">
            <template #default="{ row }">
              <el-switch v-model="row.enabled" />
            </template>
          </el-table-column>
          <el-table-column prop="timeout" label="超时(ms)" width="120">
            <template #default="{ row }">
              <el-input-number v-model="row.timeout" :min="1000" size="small" />
            </template>
          </el-table-column>
        </el-table>

        <el-divider>定时配置</el-divider>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="启用定时">
              <el-switch v-model="task.schedule.enabled" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Cron表达式">
              <el-input v-model="task.schedule.cron" :disabled="!task.schedule.enabled" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider>执行历史</el-divider>

        <el-table :data="history" style="width: 100%" max-height="300">
          <el-table-column prop="startedAt" label="开始时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.startedAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button
                v-if="row.outputFiles && row.outputFiles.length > 0"
                size="small"
                type="primary"
                link
                @click="downloadDocument(row.outputFiles[0])"
              >
                下载文档
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { taskService, reportTemplateService, docService } from '@/services/api'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const task = ref(null)
const templates = ref([])
const history = ref([])

onMounted(async () => {
  await loadTask()
  await loadTemplates()
  await loadHistory()
})

async function loadTask() {
  loading.value = true
  try {
    const res = await taskService.getTask(route.params.id)
    task.value = res.data
    if (!task.value.schedule) {
      task.value.schedule = { enabled: false, cron: '' }
    }
  } catch (error) {
    console.error('加载任务详情失败:', error)
    router.push('/tasks')
  } finally {
    loading.value = false
  }
}

async function loadTemplates() {
  try {
    const res = await reportTemplateService.getTemplates({ limit: 100 })
    templates.value = res.data || []
  } catch (error) {
    console.error('加载模板列表失败:', error)
  }
}

async function loadHistory() {
  try {
    const res = await taskService.getTaskHistory(route.params.id)
    history.value = res.data || []
  } catch (error) {
    console.error('加载历史记录失败:', error)
  }
}

async function saveTask() {
  try {
    const dataToSave = {
      name: task.value.name,
      description: task.value.description,
      apis: task.value.apis,
      schedule: task.value.schedule,
      reportTemplate: task.value.reportTemplate,
      outputConfig: task.value.outputConfig
    }
    await taskService.updateTask(route.params.id, dataToSave)
    ElMessage.success('保存成功')
  } catch (error) {
    console.error('保存任务失败:', error)
    ElMessage.error('保存失败: ' + (error.response?.data?.error || error.message))
  }
}

async function runTask() {
  try {
    ElMessage.info('执行中...')
    const res = await taskService.runTask(route.params.id)
    ElMessage.success('执行成功')
    await loadHistory()
  } catch (error) {
    console.error('执行任务失败:', error)
  }
}

function downloadDocument(filepath) {
  const filename = filepath.split(/[/\\]/).pop()
  docService.downloadDocument(filename)
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
</script>

<style scoped>
.task-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.el-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
</style>
