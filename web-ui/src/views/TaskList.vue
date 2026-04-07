<template>
  <div class="task-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-select v-model="selectedStatus" placeholder="选择状态" clearable style="width: 150px" @change="loadTasks">
              <el-option label="待执行" value="pending" />
              <el-option label="执行中" value="running" />
              <el-option label="成功" value="success" />
              <el-option label="失败" value="failed" />
              <el-option label="部分成功" value="partial" />
            </el-select>
          </div>
          
          <div class="header-right">
            <el-button type="primary" @click="showCreateDialog = true">
              <el-icon><Plus /></el-icon>
              创建任务
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="tasks" style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="任务名称" min-width="200" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="apis" label="API数量" width="100">
          <template #default="{ row }">
            {{ row.apis?.length || 0 }}
          </template>
        </el-table-column>
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
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" @click="runTask(row)">
              <el-icon><VideoPlay /></el-icon>
              执行
            </el-button>
            <el-button size="small" type="primary" link @click="editTask(row)">
              编辑
            </el-button>
            <el-button size="small" type="info" link @click="viewHistory(row)">
              历史
            </el-button>
            <el-button size="small" type="danger" link @click="deleteTask(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 20px; justify-content: flex-end"
        @size-change="loadTasks"
        @current-change="loadTasks"
      />
    </el-card>

    <el-dialog v-model="showCreateDialog" title="创建任务" width="800px">
      <el-form :model="taskForm" label-width="120px">
        <el-form-item label="任务名称">
          <el-input v-model="taskForm.name" placeholder="任务名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="taskForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="选择API">
          <el-transfer
            v-model="taskForm.selectedApis"
            :data="availableApis"
            :titles="['可用API', '已选API']"
            filterable
            filter-placeholder="搜索API"
          />
        </el-form-item>
        <el-form-item label="文档模板">
          <el-select v-model="taskForm.template" placeholder="选择模板" style="width: 100%">
            <el-option
              v-for="tpl in templates"
              :key="tpl._id"
              :label="tpl.name"
              :value="tpl._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="定时执行">
          <el-switch v-model="taskForm.scheduleEnabled" />
        </el-form-item>
        <el-form-item v-if="taskForm.scheduleEnabled" label="Cron表达式">
          <el-input v-model="taskForm.scheduleCron" placeholder="0 0 * * *" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createTask">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showHistoryDialog" title="执行历史" width="900px">
      <el-table :data="taskHistory" style="width: 100%">
        <el-table-column prop="startedAt" label="开始时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.startedAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="completedAt" label="完成时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.completedAt) }}
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
    </el-dialog>

    <el-dialog v-model="showRunDialog" title="任务执行中" width="600px" :close-on-click-modal="false">
      <div class="run-progress">
        <el-progress :percentage="runProgress" :status="runStatus" />
        <div style="margin-top: 20px">{{ runMessage }}</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { taskService, apiService, reportTemplateService, docService } from '@/services/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const tasks = ref([])
const selectedStatus = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const showCreateDialog = ref(false)
const showHistoryDialog = ref(false)
const showRunDialog = ref(false)
const taskHistory = ref([])
const availableApis = ref([])
const templates = ref([])

const runProgress = ref(0)
const runStatus = ref('')
const runMessage = ref('')

const taskForm = ref({
  name: '',
  description: '',
  selectedApis: [],
  template: '',
  scheduleEnabled: false,
  scheduleCron: '0 0 * * *'
})

onMounted(async () => {
  await loadTasks()
  await loadAvailableApis()
  await loadTemplates()
})

async function loadTasks() {
  loading.value = true
  try {
    const res = await taskService.getTasks({
      page: currentPage.value,
      limit: pageSize.value,
      status: selectedStatus.value
    })
    tasks.value = res.data || []
    total.value = res.pagination?.total || 0
  } catch (error) {
    console.error('加载任务列表失败:', error)
  } finally {
    loading.value = false
  }
}

async function loadAvailableApis() {
  try {
    const res = await apiService.getApis({ limit: 1000 })
    availableApis.value = (res.data || []).map(api => ({
      key: api._id,
      label: api.name,
      disabled: false
    }))
  } catch (error) {
    console.error('加载API列表失败:', error)
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

async function createTask() {
  try {
    const data = {
      name: taskForm.value.name,
      description: taskForm.value.description,
      apis: taskForm.value.selectedApis.map(id => ({ api: id })),
      reportTemplate: taskForm.value.template,
      schedule: {
        enabled: taskForm.value.scheduleEnabled,
        cron: taskForm.value.scheduleCron
      }
    }
    
    await taskService.createTask(data)
    ElMessage.success('创建成功')
    showCreateDialog.value = false
    await loadTasks()
  } catch (error) {
    console.error('创建任务失败:', error)
  }
}

async function runTask(task) {
  try {
    showRunDialog.value = true
    runProgress.value = 0
    runStatus.value = ''
    runMessage.value = '正在执行任务...'
    
    const res = await taskService.runTask(task._id)
    
    runProgress.value = 100
    runStatus.value = res.data.status === 'success' ? 'success' : 'exception'
    runMessage.value = `执行完成: ${res.data.successCount} 成功, ${res.data.failCount} 失败`
    
    setTimeout(() => {
      showRunDialog.value = false
      if (res.data.document?.path) {
        ElMessageBox.confirm('任务执行完成，是否下载报告文档？', '提示', {
          type: 'success'
        }).then(() => {
          const filename = res.data.document.path.split('/').pop()
          docService.downloadDocument(filename)
        }).catch(() => {})
      }
    }, 1500)
    
    await loadTasks()
  } catch (error) {
    runProgress.value = 100
    runStatus.value = 'exception'
    runMessage.value = '执行失败: ' + error.message
    console.error('执行任务失败:', error)
  }
}

function editTask(task) {
  router.push(`/tasks/${task._id}`)
}

async function viewHistory(task) {
  try {
    const res = await taskService.getTaskHistory(task._id)
    taskHistory.value = res.data || []
    showHistoryDialog.value = true
  } catch (error) {
    console.error('获取历史记录失败:', error)
  }
}

async function deleteTask(task) {
  try {
    await ElMessageBox.confirm('确定要删除此任务吗？', '提示', {
      type: 'warning'
    })
    await taskService.deleteTask(task._id)
    ElMessage.success('删除成功')
    await loadTasks()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除任务失败:', error)
    }
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
.task-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
}

.el-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.run-progress {
  text-align: center;
  padding: 40px 20px;
}
</style>
