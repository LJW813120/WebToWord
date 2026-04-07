<template>
  <el-dialog v-model="visible" title="快速执行" width="600px">
    <el-form :model="form" label-width="100px">
      <el-form-item label="选择任务">
        <el-select v-model="form.taskId" placeholder="选择要执行的任务" style="width: 100%">
          <el-option
            v-for="task in tasks"
            :key="task._id"
            :label="task.name"
            :value="task._id"
          />
        </el-select>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="executeTask" :loading="executing">
        执行
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { taskService } from '@/services/api'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue'])

const visible = ref(false)
const executing = ref(false)
const tasks = ref([])

const form = ref({
  taskId: ''
})

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    loadTasks()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

onMounted(() => {
  loadTasks()
})

async function loadTasks() {
  try {
    const res = await taskService.getTasks({ limit: 100 })
    tasks.value = res.data || []
  } catch (error) {
    console.error('加载任务列表失败:', error)
  }
}

async function executeTask() {
  if (!form.value.taskId) {
    ElMessage.warning('请选择任务')
    return
  }

  executing.value = true
  try {
    const res = await taskService.runTask(form.value.taskId)
    ElMessage.success('任务执行成功')
    visible.value = false
  } catch (error) {
    console.error('执行任务失败:', error)
  } finally {
    executing.value = false
  }
}
</script>
