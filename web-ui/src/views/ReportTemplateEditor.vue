<template>
  <div class="report-template-editor">
    <el-card>
      <template #header>
        <div class="card-header">
          <el-button link @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <span>{{ isNew ? '新建报告模板' : '编辑报告模板' }}</span>
          <div>
            <el-button @click="previewTemplate">预览</el-button>
            <el-button type="primary" @click="saveTemplate">保存</el-button>
          </div>
        </div>
      </template>

      <el-form :model="template" label-width="100px" v-loading="loading">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="模板名称" required>
              <el-input v-model="template.name" placeholder="请输入模板名称" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="分类">
              <el-input v-model="template.category" placeholder="default" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="设为默认">
              <el-switch v-model="template.isDefault" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="描述">
          <el-input v-model="template.description" type="textarea" :rows="2" placeholder="请输入模板描述" />
        </el-form-item>

        <el-divider content-position="left">数据源配置</el-divider>

        <el-row :gutter="20">
          <el-col :span="16">
            <el-form-item label="选择API">
              <el-select v-model="selectedApiId" placeholder="选择API获取字段" style="width: 100%;" filterable>
                <el-option
                  v-for="api in apis"
                  :key="api._id"
                  :label="`${api.name} (${api.method})`"
                  :value="api._id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label=" ">
              <el-button type="primary" @click="fetchApiFields" :loading="fetchingFields" :disabled="!selectedApiId">
                执行API获取字段
              </el-button>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">模板编辑</el-divider>

        <div class="editor-container">
          <div class="toolbar">
            <el-button-group>
              <el-button size="small" @click="insertTag('h1')">H1</el-button>
              <el-button size="small" @click="insertTag('h2')">H2</el-button>
              <el-button size="small" @click="insertTag('h3')">H3</el-button>
              <el-button size="small" @click="insertTag('p')">段落</el-button>
              <el-button size="small" @click="insertTag('table')">表格</el-button>
            </el-button-group>
            <el-button-group style="margin-left: 10px;">
              <el-button size="small" @click="insertPlaceholder">插入字段</el-button>
              <el-button size="small" @click="insertLoop">循环</el-button>
              <el-button size="small" @click="insertCondition">条件</el-button>
            </el-button-group>
          </div>

          <div class="editor-main">
            <div class="code-editor">
              <el-input
                v-model="template.htmlContent"
                type="textarea"
                :rows="20"
                placeholder="请输入HTML模板内容，使用 {{fieldName}} 插入数据字段"
                @input="onHtmlChange"
              />
            </div>

            <div class="preview-panel">
              <div class="preview-header">
                <span>预览</span>
              </div>
              <div class="preview-content" v-html="previewHtml"></div>
            </div>
          </div>
        </div>

        <el-divider content-position="left">可用字段</el-divider>

        <div class="available-fields">
          <el-tabs v-model="activeFieldTab">
            <el-tab-pane label="默认字段" name="default">
              <el-alert type="info" :closable="false" style="margin-bottom: 10px;">
                点击字段复制占位符。数组字段点击后可选择插入循环模板。
              </el-alert>
              <el-row :gutter="10">
                <el-col :span="6" v-for="field in defaultFields" :key="field.path">
                  <div class="field-item" :class="{ 'is-array': field.type === 'array' }" @click="handleFieldClick(field)">
                    <el-icon><DocumentCopy /></el-icon>
                    <span>{{ field.path }}</span>
                    <el-tag size="small" :type="field.type === 'array' ? 'warning' : 'info'">{{ field.type }}</el-tag>
                  </div>
                </el-col>
              </el-row>
            </el-tab-pane>
            
            <el-tab-pane label="API字段" name="api">
              <el-alert type="warning" :closable="false" style="margin-bottom: 10px;" v-if="apiFields.length === 0">
                请先选择API并点击"执行API获取字段"按钮
              </el-alert>
              <el-alert type="info" :closable="false" style="margin-bottom: 10px;" v-if="apiFields.length > 0">
                点击字段复制占位符。数组字段（黄色标签）点击后可选择插入循环模板。
              </el-alert>
              <el-row :gutter="10" v-if="apiFields.length > 0">
                <el-col :span="6" v-for="field in apiFields" :key="field.path">
                  <div class="field-item" :class="{ 'is-array': field.type === 'array' }" @click="handleFieldClick(field)">
                    <el-icon><DocumentCopy /></el-icon>
                    <span>{{ field.path }}</span>
                    <el-tag size="small" :type="field.type === 'array' ? 'warning' : 'info'">{{ field.type }}</el-tag>
                  </div>
                </el-col>
              </el-row>
              <div v-if="apiFields.length > 0" style="margin-top: 10px;">
                <el-collapse>
                  <el-collapse-item title="查看API响应数据" name="data">
                    <pre class="response-preview">{{ JSON.stringify(apiResponseData, null, 2) }}</pre>
                  </el-collapse-item>
                </el-collapse>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-form>
    </el-card>

    <el-dialog v-model="showPreviewDialog" title="模板预览" width="80%">
      <div class="preview-dialog-content" v-html="previewHtml"></div>
    </el-dialog>

    <el-dialog v-model="showArrayFieldDialog" title="数组字段操作" width="500px">
      <el-alert type="info" :closable="false" style="margin-bottom: 15px;">
        此字段是数组类型，请选择使用方式
      </el-alert>
      <el-form label-width="100px">
        <el-form-item label="字段路径">
          <el-input :model-value="selectedArrayField" readonly />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showArrayFieldDialog = false">取消</el-button>
        <el-button @click="copyArrayFieldPath">复制路径</el-button>
        <el-button type="primary" @click="insertArrayLoop">插入循环模板</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showFieldDialog" title="插入字段" width="500px">
      <el-form label-width="80px">
        <el-form-item label="字段名称">
          <el-input v-model="fieldName" placeholder="例如: taskName" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showFieldDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmInsertField">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showLoopDialog" title="插入循环" width="500px">
      <el-form label-width="80px">
        <el-form-item label="数组字段">
          <el-input v-model="loopArray" placeholder="例如: rows" />
        </el-form-item>
        <el-form-item label="循环内容">
          <el-input v-model="loopContent" type="textarea" :rows="3" placeholder="循环内的HTML内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showLoopDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmInsertLoop">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, DocumentCopy } from '@element-plus/icons-vue'
import { reportTemplateService, apiService } from '@/services/api'

const route = useRoute()
const router = useRouter()

const isNew = computed(() => route.params.id === 'new')
const templateId = computed(() => route.params.id)

const loading = ref(false)
const showPreviewDialog = ref(false)
const showFieldDialog = ref(false)
const showLoopDialog = ref(false)
const showArrayFieldDialog = ref(false)

const template = ref({
  name: '',
  description: '',
  htmlContent: '',
  cssContent: '',
  category: 'default',
  isDefault: false
})

const fieldName = ref('')
const loopArray = ref('')
const loopContent = ref('')
const selectedArrayField = ref('')

const previewHtml = ref('')
const activeFieldTab = ref('default')

const apis = ref([])
const selectedApiId = ref('')
const fetchingFields = ref(false)
const apiFields = ref([])
const apiResponseData = ref(null)

const defaultFields = ref([
  { path: 'taskName', type: 'string' },
  { path: 'startTime', type: 'string' },
  { path: 'endTime', type: 'string' },
  { path: 'duration', type: 'number' },
  { path: 'status', type: 'string' },
  { path: 'total', type: 'number' },
  { path: 'rows', type: 'array' },
  { path: 'rows[].fieldName', type: 'string' }
])

onMounted(async () => {
  await loadApis()
  if (!isNew.value) {
    await loadTemplate()
  }
  updatePreview()
})

async function loadApis() {
  try {
    const res = await apiService.getApis({ limit: 1000 })
    if (res.success) {
      apis.value = res.data || []
    }
  } catch (error) {
    console.error('加载API列表失败:', error)
  }
}

async function loadTemplate() {
  loading.value = true
  try {
    const res = await reportTemplateService.getTemplate(templateId.value)
    if (res.success) {
      template.value = res.data
      updatePreview()
    }
  } catch (error) {
    console.error('加载模板失败:', error)
  } finally {
    loading.value = false
  }
}

async function fetchApiFields() {
  if (!selectedApiId.value) {
    ElMessage.warning('请选择API')
    return
  }
  
  fetchingFields.value = true
  apiFields.value = []
  
  try {
    const res = await apiService.executeApi(selectedApiId.value)
    if (res.success && res.data) {
      const responseData = res.data.data || res.data
      apiResponseData.value = responseData
      apiFields.value = extractFields(responseData)
      activeFieldTab.value = 'api'
      ElMessage.success(`获取到 ${apiFields.value.length} 个字段`)
    }
  } catch (error) {
    console.error('执行API失败:', error)
    ElMessage.error('执行API失败')
  } finally {
    fetchingFields.value = false
  }
}

function extractFields(data, prefix = '', maxDepth = 5) {
  const fields = []
  
  if (!data || typeof data !== 'object' || maxDepth <= 0) {
    if (data !== null && data !== undefined) {
      fields.push({
        path: prefix || 'value',
        type: typeof data,
        sampleValue: String(data).substring(0, 50)
      })
    }
    return fields
  }

  if (Array.isArray(data)) {
    if (data.length > 0) {
      const firstItem = data[0]
      if (typeof firstItem === 'object' && firstItem !== null) {
        fields.push({
          path: prefix ? `${prefix}[]` : '[]',
          type: 'array',
          sampleValue: `[${data.length} items]`
        })
        const itemFields = extractFields(firstItem, prefix ? `${prefix}[]` : '[]', maxDepth - 1)
        fields.push(...itemFields)
      } else {
        fields.push({
          path: prefix || 'array',
          type: 'array',
          sampleValue: data.slice(0, 3).map(v => String(v).substring(0, 20)).join(', '),
          itemType: typeof firstItem
        })
      }
    } else {
      fields.push({
        path: prefix || 'array',
        type: 'array',
        sampleValue: '[]'
      })
    }
    return fields
  }

  for (const key of Object.keys(data)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    const value = data[key]

    if (value === null || value === undefined) {
      fields.push({
        path: fullKey,
        type: 'null',
        sampleValue: 'null'
      })
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        const firstItem = value[0]
        if (typeof firstItem === 'object' && firstItem !== null) {
          fields.push({
            path: fullKey,
            type: 'array',
            sampleValue: `[${value.length} objects]`
          })
          const itemFields = extractFields(firstItem, `${fullKey}[]`, maxDepth - 1)
          fields.push(...itemFields)
        } else {
          fields.push({
            path: fullKey,
            type: 'array',
            sampleValue: value.slice(0, 3).map(v => String(v).substring(0, 20)).join(', '),
            itemType: typeof firstItem
          })
        }
      } else {
        fields.push({
          path: fullKey,
          type: 'array',
          sampleValue: '[]'
        })
      }
    } else if (typeof value === 'object') {
      fields.push({
        path: fullKey,
        type: 'object',
        sampleValue: '{...}'
      })
      fields.push(...extractFields(value, fullKey, maxDepth - 1))
    } else {
      fields.push({
        path: fullKey,
        type: typeof value,
        sampleValue: String(value).substring(0, 50)
      })
    }
  }

  return fields
}

function onHtmlChange() {
  updatePreview()
}

function updatePreview() {
  let html = template.value.htmlContent || ''
  
  html = html.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    return `<span class="placeholder">${match}</span>`
  })
  
  html = html.replace(/\{\{#each\s+([^}]+)\}\}/g, '<div class="loop-start">循环: $1')
  html = html.replace(/\{\{\/each\}\}/g, '</div>')
  html = html.replace(/\{\{#if\s+([^}]+)\}\}/g, '<div class="condition-start">条件: $1')
  html = html.replace(/\{\{\/if\}\}/g, '</div>')
  
  previewHtml.value = html
}

function insertTag(tag) {
  const textarea = document.querySelector('.code-editor textarea')
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const content = template.value.htmlContent || ''
  
  let insertContent = ''
  switch (tag) {
    case 'h1':
    case 'h2':
    case 'h3':
      insertContent = `<${tag}>标题</${tag}>`
      break
    case 'p':
      insertContent = '<p>段落内容</p>'
      break
    case 'table':
      insertContent = `<table border="1" style="width:100%;border-collapse:collapse;">
  <tr>
    <th>列1</th>
    <th>列2</th>
  </tr>
  <tr>
    <td>{{field1}}</td>
    <td>{{field2}}</td>
  </tr>
</table>`
      break
  }
  
  template.value.htmlContent = content.substring(0, start) + insertContent + content.substring(end)
  updatePreview()
}

function insertPlaceholder() {
  showFieldDialog.value = true
  fieldName.value = ''
}

function confirmInsertField() {
  if (!fieldName.value) {
    ElMessage.warning('请输入字段名称')
    return
  }
  
  const textarea = document.querySelector('.code-editor textarea')
  const start = textarea.selectionStart
  const content = template.value.htmlContent || ''
  
  const insertContent = `{{${fieldName.value}}}`
  template.value.htmlContent = content.substring(0, start) + insertContent + content.substring(start)
  
  showFieldDialog.value = false
  updatePreview()
}

function insertLoop() {
  showLoopDialog.value = true
  loopArray.value = ''
  loopContent.value = ''
}

function confirmInsertLoop() {
  if (!loopArray.value) {
    ElMessage.warning('请输入数组字段名')
    return
  }
  
  const textarea = document.querySelector('.code-editor textarea')
  const start = textarea.selectionStart
  const content = template.value.htmlContent || ''
  
  const insertContent = `{{#each ${loopArray.value}}}\n${loopContent.value || '<p>{{字段名}}</p>'}\n{{/each}}`
  template.value.htmlContent = content.substring(0, start) + insertContent + content.substring(start)
  
  showLoopDialog.value = false
  updatePreview()
}

function insertCondition() {
  const textarea = document.querySelector('.code-editor textarea')
  const start = textarea.selectionStart
  const content = template.value.htmlContent || ''
  
  const insertContent = `{{#if fieldName}}\n<p>条件为真时显示</p>\n{{/if}}`
  template.value.htmlContent = content.substring(0, start) + insertContent + content.substring(start)
  
  updatePreview()
}

function copyField(path) {
  navigator.clipboard.writeText(`{{${path}}}`).then(() => {
    ElMessage.success('已复制: {{' + path + '}}')
  })
}

function handleFieldClick(field) {
  if (field.type === 'array') {
    selectedArrayField.value = field.path
    showArrayFieldDialog.value = true
  } else {
    copyField(field.path)
  }
}

function copyArrayFieldPath() {
  copyField(selectedArrayField.value)
  showArrayFieldDialog.value = false
}

function insertArrayLoop() {
  const arrayPath = selectedArrayField.value.replace(/\[\]$/, '')
  const textarea = document.querySelector('.code-editor textarea')
  const start = textarea.selectionStart
  const content = template.value.htmlContent || ''
  
  const insertContent = `{{#each ${arrayPath}}}
<p>{{字段名}}</p>
{{/each}}`
  template.value.htmlContent = content.substring(0, start) + insertContent + content.substring(start)
  
  showArrayFieldDialog.value = false
  updatePreview()
  ElMessage.success('已插入循环模板，请修改字段名')
}

function previewTemplate() {
  showPreviewDialog.value = true
}

async function saveTemplate() {
  if (!template.value.name) {
    ElMessage.warning('请输入模板名称')
    return
  }
  
  try {
    let res
    if (isNew.value) {
      res = await reportTemplateService.createTemplate(template.value)
    } else {
      res = await reportTemplateService.updateTemplate(templateId.value, template.value)
    }
    
    if (res.success) {
      ElMessage.success('保存成功')
      router.push('/report-templates')
    }
  } catch (error) {
    console.error('保存失败:', error)
  }
}

function goBack() {
  router.push('/report-templates')
}
</script>

<style scoped>
.report-template-editor {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.toolbar {
  padding: 10px;
  background: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
}

.editor-main {
  display: flex;
  height: 500px;
}

.code-editor {
  flex: 1;
  border-right: 1px solid #dcdfe6;
}

.code-editor :deep(textarea) {
  font-family: monospace;
  font-size: 13px;
  line-height: 1.5;
  border: none;
  border-radius: 0;
}

.preview-panel {
  width: 50%;
  display: flex;
  flex-direction: column;
}

.preview-header {
  padding: 10px;
  background: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
  font-weight: bold;
}

.preview-content {
  flex: 1;
  padding: 15px;
  overflow: auto;
  background: white;
}

.preview-content :deep(.placeholder) {
  background: #e6f7ff;
  border: 1px dashed #1890ff;
  padding: 2px 4px;
  border-radius: 2px;
  color: #1890ff;
}

.preview-content :deep(.loop-start),
.preview-content :deep(.condition-start) {
  background: #f6ffed;
  border: 1px dashed #52c41a;
  padding: 5px;
  margin: 5px 0;
  border-radius: 4px;
  color: #52c41a;
}

.available-fields {
  padding: 15px;
  background: #fafafa;
  border-radius: 4px;
}

.field-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 8px;
}

.field-item:hover {
  border-color: #1890ff;
  background: #e6f7ff;
}

.field-item.is-array {
  border-color: #faad14;
  background: #fffbe6;
}

.field-item.is-array:hover {
  border-color: #fa8c16;
  background: #fff1b8;
}

.field-item span {
  flex: 1;
  font-family: monospace;
  font-size: 12px;
}

.response-preview {
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 300px;
  overflow: auto;
}

.preview-dialog-content {
  padding: 20px;
  background: white;
  min-height: 300px;
}
</style>
