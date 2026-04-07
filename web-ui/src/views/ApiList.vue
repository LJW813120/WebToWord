<template>
  <div class="api-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-input
              v-model="searchText"
              placeholder="搜索API..."
              style="width: 300px"
              clearable
              @input="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            
            <el-select v-model="selectedCategory" placeholder="选择分类" clearable style="width: 150px; margin-left: 10px" @change="loadApis">
              <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
            </el-select>
          </div>
          
          <div class="header-right">
            <el-button type="primary" @click="showCreateDialog = true">
              <el-icon><Plus /></el-icon>
              添加API
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="apis" style="width: 100%" v-loading="loading">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="名称" min-width="200" />
        <el-table-column prop="method" label="方法" width="100">
          <template #default="{ row }">
            <el-tag :type="getMethodType(row.method)" size="small">
              {{ row.method }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="url" label="URL" min-width="300" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column prop="lastResponseStatus" label="最后状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.lastResponseStatus" :type="row.lastResponseStatus < 400 ? 'success' : 'danger'">
              {{ row.lastResponseStatus }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="lastExecutedAt" label="最后执行" width="180">
          <template #default="{ row }">
            {{ formatDate(row.lastExecutedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="executeApi(row)">
              执行
            </el-button>
            <el-button size="small" type="primary" link @click="editApi(row)">
              编辑
            </el-button>
            <el-button size="small" type="danger" link @click="deleteApi(row)">
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
        @size-change="loadApis"
        @current-change="loadApis"
      />
    </el-card>

    <el-dialog v-model="showCreateDialog" title="添加API" width="600px">
      <el-form :model="apiForm" label-width="100px">
        <el-form-item label="名称">
          <el-input v-model="apiForm.name" placeholder="API名称" />
        </el-form-item>
        <el-form-item label="方法">
          <el-select v-model="apiForm.method" style="width: 100%">
            <el-option label="GET" value="GET" />
            <el-option label="POST" value="POST" />
            <el-option label="PUT" value="PUT" />
            <el-option label="DELETE" value="DELETE" />
            <el-option label="PATCH" value="PATCH" />
          </el-select>
        </el-form-item>
        <el-form-item label="URL">
          <el-input v-model="apiForm.url" placeholder="API URL" />
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="apiForm.category" placeholder="分类" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="apiForm.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createApi">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showResultDialog" title="执行结果" width="700px">
      <div v-if="executionResult">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="状态">
            <el-tag :type="executionResult.success ? 'success' : 'danger'">
              {{ executionResult.success ? '成功' : '失败' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="HTTP状态码">
            {{ executionResult.status }}
          </el-descriptions-item>
          <el-descriptions-item label="耗时">
            {{ executionResult.duration }}ms
          </el-descriptions-item>
          <el-descriptions-item label="时间">
            {{ executionResult.timestamp }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div style="margin-top: 20px">
          <h4>响应数据</h4>
          <el-input
            type="textarea"
            :rows="10"
            readonly
            :model-value="JSON.stringify(executionResult.data, null, 2)"
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiService } from '@/services/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const apis = ref([])
const categories = ref([])
const searchText = ref('')
const selectedCategory = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const showCreateDialog = ref(false)
const showResultDialog = ref(false)
const executionResult = ref(null)

const apiForm = ref({
  name: '',
  method: 'GET',
  url: '',
  category: 'default',
  description: ''
})

onMounted(async () => {
  await loadApis()
  await loadCategories()
})

async function loadApis() {
  loading.value = true
  try {
    const res = await apiService.getApis({
      page: currentPage.value,
      limit: pageSize.value,
      search: searchText.value,
      category: selectedCategory.value
    })
    apis.value = res.data || []
    total.value = res.pagination?.total || 0
  } catch (error) {
    console.error('加载API列表失败:', error)
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    const res = await apiService.getCategories()
    categories.value = res.data || []
  } catch (error) {
    console.error('加载分类失败:', error)
  }
}

function handleSearch() {
  currentPage.value = 1
  loadApis()
}

async function createApi() {
  try {
    await apiService.createApi(apiForm.value)
    ElMessage.success('创建成功')
    showCreateDialog.value = false
    await loadApis()
  } catch (error) {
    console.error('创建API失败:', error)
  }
}

async function executeApi(api) {
  try {
    ElMessage.info('执行中...')
    const res = await apiService.executeApi(api._id)
    executionResult.value = res.data
    showResultDialog.value = true
    await loadApis()
  } catch (error) {
    console.error('执行API失败:', error)
  }
}

function editApi(api) {
  router.push(`/apis/${api._id}`)
}

async function deleteApi(api) {
  try {
    await ElMessageBox.confirm('确定要删除此API吗？', '提示', {
      type: 'warning'
    })
    await apiService.deleteApi(api._id)
    ElMessage.success('删除成功')
    await loadApis()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除API失败:', error)
    }
  }
}

function getMethodType(method) {
  const types = {
    GET: 'success',
    POST: 'primary',
    PUT: 'warning',
    DELETE: 'danger',
    PATCH: 'info'
  }
  return types[method] || 'info'
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped>
.api-list {
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

.header-right {
  display: flex;
  align-items: center;
}

.el-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
