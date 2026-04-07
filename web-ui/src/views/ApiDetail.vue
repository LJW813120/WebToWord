<template>
  <div class="api-detail">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>{{ api?.name || 'API详情' }}</span>
          <div>
            <el-button type="primary" @click="executeApi">
              <el-icon><VideoPlay /></el-icon>
              执行
            </el-button>
            <el-button @click="saveApi">保存</el-button>
          </div>
        </div>
      </template>

      <el-form v-if="api" :model="api" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="名称">
              <el-input v-model="api.name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分类">
              <el-input v-model="api.category" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="方法">
              <el-select v-model="api.method" style="width: 100%">
                <el-option label="GET" value="GET" />
                <el-option label="POST" value="POST" />
                <el-option label="PUT" value="PUT" />
                <el-option label="DELETE" value="DELETE" />
                <el-option label="PATCH" value="PATCH" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="16">
            <el-form-item label="URL">
              <el-input v-model="api.url" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="描述">
          <el-input v-model="api.description" type="textarea" :rows="3" />
        </el-form-item>

        <el-divider>请求头</el-divider>

        <div v-for="(value, key, index) in api.headers" :key="index" style="margin-bottom: 10px">
          <el-row :gutter="10">
            <el-col :span="10">
              <el-input :model-value="key" placeholder="Header名称" />
            </el-col>
            <el-col :span="12">
              <el-input :model-value="value" placeholder="Header值" />
            </el-col>
            <el-col :span="2">
              <el-button type="danger" link>删除</el-button>
            </el-col>
          </el-row>
        </div>

        <el-button type="primary" link>
          <el-icon><Plus /></el-icon>
          添加请求头
        </el-button>

        <el-divider v-if="['POST', 'PUT', 'PATCH'].includes(api.method)">请求体</el-divider>

        <el-form-item v-if="['POST', 'PUT', 'PATCH'].includes(api.method)" label="Body">
          <el-input 
            :model-value="formatBody(api.body)" 
            type="textarea" 
            :rows="6" 
            @update:model-value="updateBody($event)"
          />
        </el-form-item>

        <el-divider v-if="api.params && Object.keys(api.params).length > 0">URL参数</el-divider>

        <div v-if="api.params && Object.keys(api.params).length > 0" class="params-section">
          <el-table :data="Object.entries(api.params).map(([key, value]) => ({ key, value }))" border>
            <el-table-column prop="key" label="参数名" width="200" />
            <el-table-column prop="value" label="参数值" />
          </el-table>
        </div>

        <el-divider v-if="api.cookies && api.cookies.length > 0">Cookies</el-divider>

        <div v-if="api.cookies && api.cookies.length > 0" class="cookies-section">
          <el-table :data="api.cookies" border>
            <el-table-column prop="name" label="Cookie名称" width="200" />
            <el-table-column prop="value" label="Cookie值" show-overflow-tooltip />
            <el-table-column prop="domain" label="域名" width="150" />
            <el-table-column prop="path" label="路径" width="100" />
            <el-table-column label="属性" width="120">
              <template #default="{ row }">
                <el-tag v-if="row.secure" type="success" size="small">Secure</el-tag>
                <el-tag v-if="row.httpOnly" type="warning" size="small">HttpOnly</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <el-divider>认证信息</el-divider>

        <el-form-item label="Token">
          <el-input v-model="api.auth.token" type="password" show-password />
        </el-form-item>
        <el-form-item label="Token类型">
          <el-select v-model="api.auth.tokenType" style="width: 100%">
            <el-option label="Bearer" value="bearer" />
            <el-option label="Basic" value="basic" />
            <el-option label="Custom" value="custom" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiService } from '@/services/api'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const api = ref(null)

onMounted(async () => {
  await loadApi()
})

async function loadApi() {
  loading.value = true
  try {
    const res = await apiService.getApi(route.params.id)
    api.value = res.data
    console.log('加载API详情:', res.data.name, 'method:', res.data.method, 'body:', res.data.body)
  } catch (error) {
    console.error('加载API详情失败:', error)
    router.push('/apis')
  } finally {
    loading.value = false
  }
}

async function saveApi() {
  try {
    await apiService.updateApi(route.params.id, api.value)
    ElMessage.success('保存成功')
  } catch (error) {
    console.error('保存API失败:', error)
  }
}

async function executeApi() {
  try {
    ElMessage.info('执行中...')
    const res = await apiService.executeApi(route.params.id)
    ElMessage.success('执行成功')
    await loadApi()
  } catch (error) {
    console.error('执行API失败:', error)
  }
}

function formatBody(body) {
  if (!body) return ''
  if (typeof body === 'string') return body
  if (typeof body === 'object') {
    if (Object.keys(body).length === 0) return ''
    return JSON.stringify(body, null, 2)
  }
  return String(body)
}

function updateBody(value) {
  try {
    api.value.body = JSON.parse(value)
  } catch {
    api.value.body = value
  }
}
</script>

<style scoped>
.api-detail {
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

.params-section,
.cookies-section {
  margin-bottom: 20px;
}
</style>
