<template>
  <el-config-provider :locale="zhCn">
    <div class="app-container">
      <el-container>
        <el-aside width="220px" class="sidebar">
          <div class="logo">
            <el-icon size="24"><Monitor /></el-icon>
            <span>API巡检系统</span>
          </div>
          <el-menu
            :default-active="activeMenu"
            router
            class="sidebar-menu"
          >
            <el-menu-item index="/dashboard">
              <el-icon><Odometer /></el-icon>
              <span>仪表盘</span>
            </el-menu-item>
            <el-menu-item index="/apis">
              <el-icon><Connection /></el-icon>
              <span>API管理</span>
            </el-menu-item>
            <el-menu-item index="/tasks">
              <el-icon><List /></el-icon>
              <span>巡检任务</span>
            </el-menu-item>
            <el-menu-item index="/report-templates">
              <el-icon><Document /></el-icon>
              <span>报告模板</span>
            </el-menu-item>
            <el-menu-item index="/documents">
              <el-icon><Folder /></el-icon>
              <span>文档列表</span>
            </el-menu-item>
          </el-menu>
        </el-aside>
        
        <el-container>
          <el-header class="header">
            <div class="header-left">
              <el-breadcrumb separator="/">
                <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
                <el-breadcrumb-item>{{ currentPageTitle }}</el-breadcrumb-item>
              </el-breadcrumb>
            </div>
            <div class="header-right">
              <el-button type="primary" @click="showQuickRun = true">
                <el-icon><VideoPlay /></el-icon>
                快速执行
              </el-button>
            </div>
          </el-header>
          
          <el-main class="main-content">
            <router-view />
          </el-main>
        </el-container>
      </el-container>
      
      <quick-run-dialog v-model="showQuickRun" />
    </div>
  </el-config-provider>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import { Monitor, Odometer, Connection, List, Document, Folder, VideoPlay } from '@element-plus/icons-vue'
import QuickRunDialog from './components/QuickRunDialog.vue'

const route = useRoute()
const showQuickRun = ref(false)

const activeMenu = computed(() => route.path)
const currentPageTitle = computed(() => route.meta?.title || '仪表盘')
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

#app {
  height: 100%;
}

.app-container {
  height: 100vh;
  overflow: hidden;
}

.app-container .el-container {
  height: 100%;
}

.sidebar {
  background: linear-gradient(180deg, #1e3a5f 0%, #0f2439 100%);
  color: white;
  height: 100%;
  overflow-y: auto;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-menu {
  border: none;
  background: transparent;
}

.sidebar-menu .el-menu-item {
  color: rgba(255, 255, 255, 0.7);
}

.sidebar-menu .el-menu-item:hover,
.sidebar-menu .el-menu-item.is-active {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.header {
  background: white;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;
}

.app-container .el-container .el-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.main-content {
  background: #f5f7fa;
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  height: calc(100vh - 60px);
}
</style>
