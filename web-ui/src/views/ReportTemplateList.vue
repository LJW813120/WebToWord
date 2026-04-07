<template>
  <div class="report-template-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>报告模板管理</span>
          <el-button type="primary" @click="createTemplate">新建模板</el-button>
        </div>
      </template>

      <el-table :data="templates" v-loading="loading" stripe>
        <el-table-column prop="name" label="模板名称" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag>{{ row.category || 'default' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="默认" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isDefault" type="success">是</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="editTemplate(row._id)">编辑</el-button>
            <el-button link type="primary" @click="duplicateTemplate(row._id)">复制</el-button>
            <el-button link type="danger" @click="deleteTemplate(row._id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { reportTemplateService } from '@/services/api'

const router = useRouter()
const templates = ref([])
const loading = ref(false)

onMounted(() => {
  loadTemplates()
})

async function loadTemplates() {
  loading.value = true
  try {
    const res = await reportTemplateService.getTemplates()
    if (res.success) {
      templates.value = res.data
    }
  } catch (error) {
    console.error('加载模板列表失败:', error)
  } finally {
    loading.value = false
  }
}

function createTemplate() {
  router.push('/report-templates/new')
}

function editTemplate(id) {
  router.push(`/report-templates/${id}`)
}

async function duplicateTemplate(id) {
  try {
    const res = await reportTemplateService.duplicateTemplate(id)
    if (res.success) {
      ElMessage.success('复制成功')
      loadTemplates()
    }
  } catch (error) {
    console.error('复制失败:', error)
  }
}

async function deleteTemplate(id) {
  try {
    await ElMessageBox.confirm('确定要删除此模板吗？', '确认删除', {
      type: 'warning'
    })
    const res = await reportTemplateService.deleteTemplate(id)
    if (res.success) {
      ElMessage.success('删除成功')
      loadTemplates()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN')
}
</script>

<style scoped>
.report-template-list {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
