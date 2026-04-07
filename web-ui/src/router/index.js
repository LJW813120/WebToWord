import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: '仪表盘' }
  },
  {
    path: '/apis',
    name: 'ApiList',
    component: () => import('@/views/ApiList.vue'),
    meta: { title: 'API管理' }
  },
  {
    path: '/apis/:id',
    name: 'ApiDetail',
    component: () => import('@/views/ApiDetail.vue'),
    meta: { title: 'API详情' }
  },
  {
    path: '/tasks',
    name: 'TaskList',
    component: () => import('@/views/TaskList.vue'),
    meta: { title: '巡检任务' }
  },
  {
    path: '/tasks/:id',
    name: 'TaskDetail',
    component: () => import('@/views/TaskDetail.vue'),
    meta: { title: '任务详情' }
  },
  {
    path: '/report-templates',
    name: 'ReportTemplateList',
    component: () => import('@/views/ReportTemplateList.vue'),
    meta: { title: '报告模板' }
  },
  {
    path: '/report-templates/:id',
    name: 'ReportTemplateEditor',
    component: () => import('@/views/ReportTemplateEditor.vue'),
    meta: { title: '编辑模板' }
  },
  {
    path: '/documents',
    name: 'DocumentList',
    component: () => import('@/views/DocumentList.vue'),
    meta: { title: '文档列表' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
