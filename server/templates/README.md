# Word模板使用说明

## 模板语法

本系统使用 docxtemplater 作为模板引擎，支持以下语法：

### 1. 简单变量替换

使用 `{{variableName}}` 语法：

```
任务名称: {{taskName}}
执行时间: {{executionTime}}
执行状态: {{status}}
```

### 2. 条件渲染

使用 `{{#if condition}}...{{/if}}` 语法：

```
{{#if success}}
✅ 任务执行成功
{{/if}}

{{#if failed}}
❌ 任务执行失败
{{/if}}
```

### 3. 循环渲染

使用 `{{#each array}}...{{/each}}` 语法：

```
API执行详情:
{{#each results}}
- {{name}}: {{method}} {{url}} - {{status}} ({{duration}}ms)
{{/each}}
```

### 4. 嵌套对象访问

使用点号访问嵌套属性：

```
响应数据: {{response.data.value}}
用户名称: {{user.profile.name}}
```

## 示例模板

### 基础巡检报告模板

```
API巡检报告

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

任务信息
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
任务名称: {{taskName}}
执行时间: {{startTime}}
完成时间: {{endTime}}
总耗时: {{duration}}ms
执行状态: {{status}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

统计信息
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
总API数: {{totalApis}}
成功: {{successCount}}
失败: {{failCount}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

执行详情
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{#each results}}

API名称: {{name}}
请求方法: {{method}}
请求URL: {{url}}
执行状态: {{#if success}}成功{{/if}}{{#unless success}}失败{{/unless}}
响应状态码: {{status}}
执行耗时: {{duration}}ms
{{#if error}}
错误信息: {{error}}
{{/if}}

{{/each}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

报告生成时间: {{generatedAt}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 高级模板（包含表格）

```
API巡检报告

任务概览
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
任务名称: {{taskName}}
执行时间: {{startTime}}
状态: {{status}}

API执行结果汇总
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| API名称 | 方法 | 状态 | 耗时 |
|---------|------|------|------|
{{#each results}}
| {{name}} | {{method}} | {{#if success}}✅{{/if}}{{#unless success}}❌{{/unless}} | {{duration}}ms |
{{/each}}

详细错误信息
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{#each results}}
{{#unless success}}
API: {{name}}
错误: {{error}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{/unless}}
{{/each}}
```

## 字段映射配置

在任务配置中，可以定义字段映射将API响应数据映射到模板字段：

```json
[
  {
    "source": "api1",
    "sourcePath": "data.userInfo.name",
    "target": "userName",
    "transform": "string"
  },
  {
    "source": "api2",
    "sourcePath": "data.metrics",
    "target": "metrics",
    "transform": "none"
  }
]
```

## 创建模板步骤

1. 使用Microsoft Word创建一个新的文档
2. 按照上述语法编写模板内容
3. 保存为 `.docx` 格式
4. 在Web界面上传模板文件
5. 配置占位符信息
6. 在任务中选择使用该模板

## 注意事项

1. 模板文件必须是 `.docx` 格式
2. 占位符名称区分大小写
3. 确保模板中的字段名称与映射配置一致
4. 复杂的表格和格式可能需要测试调整
5. 建议先使用简单模板测试，再逐步增加复杂度
