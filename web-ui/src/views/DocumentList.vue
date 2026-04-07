<template>
  <div class="document-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>生成的文档</span>
          <el-button @click="loadDocuments">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <el-table :data="documents" style="width: 100%" v-loading="loading">
        <el-table-column prop="filename" label="文件名" min-width="300" />
        <el-table-column prop="size" label="大小" width="120">
          <template #default="{ row }">
            {{ formatSize(row.size) }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="downloadDocument(row.filename)">
              <el-icon><Download /></el-icon>
              下载
            </el-button>
            <el-button size="small" type="danger" link @click="deleteDocument(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { docService } from '@/services/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const documents = ref([])

onMounted(async () => {
  await loadDocuments()
})

async function loadDocuments() {
  loading.value = true
  try {
    const res = await docService.getDocuments()
    documents.value = res.data || []
  } catch (error) {
    console.error('加载文档列表失败:', error)
  } finally {
    loading.value = false
  }
}

function downloadDocument(filename) {
  docService.downloadDocument(filename)
}

async function deleteDocument(doc) {
  try {
    await ElMessageBox.confirm('确定要删除此文档吗？', '提示', {
      type: 'warning'
    })
    await docService.deleteDocument(doc.filename)
    ElMessage.success('删除成功')
    await loadDocuments()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除文档失败:', error)
    }
  }
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}
</script>

<style scoped>
.document-list {
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
}
</style>
