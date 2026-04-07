# API巡检自动化系统

一个完整的API巡检自动化解决方案，通过浏览器插件捕获API请求，配合在线服务执行巡检任务并生成Word文档报告。

## 🎯 项目特性

- **浏览器插件捕获**: Chrome/Edge插件，可视化捕获网页API请求，支持Cookie/Session/Token认证
- **在线服务管理**: Node.js + Express后端服务，提供完整的API管理
- **SQLite数据库**: 轻量级本地数据库，无需安装额外数据库服务
- **任务自动化**: 支持API批量执行、定时任务、失败重试
- **HTML可视化模板**: 通过可视化编辑器设计报告模板，自动转换为Word文档
- **智能字段提取**: 自动从API响应中提取字段，支持嵌套数据和数组循环
- **Web管理界面**: Vue 3 + Element Plus现代化管理界面

## 📦 项目结构

```
WebAPIAuto/
├── browser-extension/      # 浏览器插件
│   ├── manifest.json       # 插件配置
│   ├── background/         # 后台脚本
│   ├── content/            # 内容脚本
│   ├── popup/              # 弹出界面
│   ├── devtools/           # 开发者工具
│   └── icons/              # 插件图标
├── server/                 # Node.js在线服务
│   ├── src/
│   │   ├── database/       # SQLite数据库配置
│   │   ├── models/         # 数据模型
│   │   ├── routes/         # API路由
│   │   ├── services/       # 业务逻辑
│   │   └── utils/          # 工具函数
│   ├── data/               # SQLite数据库文件
│   ├── uploads/            # 上传文件目录
│   └── outputs/            # 生成的文档目录
└── web-ui/                 # Web管理界面
    └── src/
        ├── views/          # 页面组件
        ├── components/     # 公共组件
        ├── services/       # API服务
        └── router/         # 路由配置
```

## 🚀 快速开始

### 前置要求

- Node.js >= 16.0.0
- Chrome 或 Edge 浏览器

> **注意**: 本项目使用SQLite数据库，无需安装MongoDB或其他数据库服务。

### 安装步骤

1. **克隆项目**
```bash
cd WebAPIAuto
```

2. **安装服务器依赖**
```bash
cd server
npm install
```

3. **安装Web界面依赖**
```bash
cd ../web-ui
npm install
```

4. **配置环境变量**（可选）

编辑 `server/.env` 文件：
```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
UPLOAD_DIR=./uploads
OUTPUT_DIR=./outputs
MAX_FILE_SIZE=10485760
```

5. **启动服务器**
```bash
cd server
npm run dev
```

服务器将在 http://localhost:3000 启动

6. **启动Web界面（开发模式）**
```bash
cd web-ui
npm run dev
```

Web界面将在 http://localhost:8080 启动

7. **构建Web界面（生产模式）**
```bash
cd web-ui
npm run build
```

构建后的文件会自动输出到 `web-ui/dist` 目录，服务器会自动提供静态文件服务。

### 安装浏览器插件

1. 打开 Chrome/Edge 浏览器
2. 访问 `chrome://extensions/` 或 `edge://extensions/`
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `browser-extension` 目录

> **提示**: 如果提示图标文件缺失，请打开 `browser-extension/generate-icons.html` 文件，点击"下载所有图标"按钮，将图标保存到 `browser-extension/icons/` 目录。

## 📖 使用指南

### 1. 捕获API请求

1. 点击浏览器插件图标
2. 配置服务器地址（默认：http://localhost:3000）
3. 点击"开始捕获"
4. 在目标网页进行操作
5. 捕获完成后点击"停止捕获"
6. 选择需要的API并上传到服务器

### 2. 管理API

- 在Web界面查看、编辑、删除API
- 测试API执行
- 按分类和标签组织API

### 3. 创建报告模板

1. 进入"报告模板"页面
2. 点击"新建模板"
3. 在"数据源配置"区域选择API
4. 点击"执行API获取字段"自动提取字段
5. 在"模板编辑"区域编写HTML模板
6. 使用工具栏插入标题、段落、表格等
7. 点击字段复制占位符，粘贴到模板中
8. 保存模板

#### 模板语法

**普通字段**
```html
<p>总数: {{total}}</p>
<p>企业名称: {{entName}}</p>
```

**循环遍历数组**
```html
{{#each rows}}
  <p>企业名称: {{entName}}</p>
  <p>处理率: {{dealPer}}</p>
{{/each}}
```

**条件判断**
```html
{{#if status}}
  <p>状态正常</p>
{{/if}}
```

**表格**
```html
<table border="1">
  <tr>
    <th>企业名称</th>
    <th>处理率</th>
  </tr>
  {{#each rows}}
  <tr>
    <td>{{entName}}</td>
    <td>{{dealPer}}</td>
  </tr>
  {{/each}}
</table>
```

### 4. 创建巡检任务

1. 进入"巡检任务"页面
2. 点击"创建任务"
3. 配置任务信息：
   - 任务名称和描述
   - 选择要执行的API
   - 配置执行顺序和超时
   - 选择报告模板
4. 保存任务

### 5. 执行任务

- 手动执行：点击"执行"按钮
- 定时执行：配置Cron表达式自动执行
- 查看执行历史和生成的文档

## 🔧 API文档

### 服务器API

#### API管理

- `GET /api/apis` - 获取API列表
- `GET /api/apis/:id` - 获取API详情
- `POST /api/apis` - 创建API
- `PUT /api/apis/:id` - 更新API
- `DELETE /api/apis/:id` - 删除API
- `POST /api/apis/:id/execute` - 执行API

#### 任务管理

- `GET /api/tasks` - 获取任务列表
- `GET /api/tasks/:id` - 获取任务详情
- `POST /api/tasks` - 创建任务
- `PUT /api/tasks/:id` - 更新任务
- `DELETE /api/tasks/:id` - 删除任务
- `POST /api/tasks/:id/run` - 执行任务
- `GET /api/tasks/:id/history` - 获取执行历史

#### 报告模板管理

- `GET /api/report-templates` - 获取模板列表
- `GET /api/report-templates/:id` - 获取模板详情
- `POST /api/report-templates` - 创建模板
- `PUT /api/report-templates/:id` - 更新模板
- `DELETE /api/report-templates/:id` - 删除模板
- `POST /api/report-templates/:id/duplicate` - 复制模板
- `POST /api/report-templates/:id/preview` - 预览模板
- `POST /api/report-templates/generate` - 生成报告

#### 文档管理

- `GET /api/docs/list` - 获取文档列表
- `GET /api/docs/download/:filename` - 下载文档
- `DELETE /api/docs/:filename` - 删除文档

## 🎨 技术栈

### 浏览器插件
- Manifest V3
- Chrome Extensions API
- Vanilla JavaScript

### 后端服务
- Node.js
- Express
- SQLite (better-sqlite3)
- docx (Word文档生成)
- axios (HTTP客户端)

### 前端界面
- Vue 3
- Vite
- Element Plus
- Vue Router
- Axios

## 💾 数据库说明

本项目使用 **SQLite** 作为数据库，具有以下优势：

- ✅ **无需安装**: 不需要单独安装数据库服务
- ✅ **轻量级**: 数据库文件小巧，便于备份
- ✅ **零配置**: 开箱即用，无需复杂配置
- ✅ **高性能**: 对于中小规模应用性能优异
- ✅ **易备份**: 直接复制数据库文件即可

数据库文件位置: `server/data/webapi_auto.db`

## 📝 开发说明

### 开发模式

```bash
# 服务器开发模式（自动重启）
cd server
npm run dev

# 前端开发模式（热重载）
cd web-ui
npm run dev
```

### 生产部署

```bash
# 构建前端
cd web-ui
npm run build

# 启动服务器
cd ../server
npm start
```

### 数据备份

直接复制数据库文件即可：
```bash
cp server/data/webapi_auto.db backup/webapi_auto_backup.db
```

## 🔍 故障排除

### 浏览器插件无法加载

如果提示图标文件缺失：
1. 打开 `browser-extension/generate-icons.html`
2. 点击"下载所有图标"
3. 将下载的PNG文件保存到 `browser-extension/icons/` 目录
4. 重新加载插件

### 服务器启动失败

检查端口是否被占用：
```bash
# Windows
netstat -ano | findstr :3000

# 如果端口被占用，修改 server/.env 中的 PORT 配置
```

### 数据库错误

如果数据库损坏，可以删除数据库文件重新初始化：
```bash
rm server/data/webapi_auto.db
# 重启服务器会自动创建新的数据库
```

### 模板字段不显示

确保模板语法正确：
- 普通字段：`{{fieldName}}`
- 循环：`{{#each array}}...{{/each}}`
- 循环内字段直接使用字段名：`{{field}}`（不需要数组前缀）

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - 高性能SQLite绑定
- [docx](https://github.com/dolanmiu/docx) - Word文档生成库
- [Element Plus](https://element-plus.org/) - Vue 3 UI组件库
