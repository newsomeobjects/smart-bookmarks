# AIMark - AI 智能书签分类器

<p align="center">
  <img src="icons/icon128.png" alt="AIMark Logo" width="128" height="128">
</p>

<p align="center">
  <strong>基于 AI 技术的智能书签管理工具</strong>
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="#">中文</a>
</p>

---

### 项目概述

**AIMark（智能书签分类器）** 是一款基于 AI 技术的浏览器扩展，能够自动整理和分类您的书签。告别杂乱的书签栏，享受整洁有序的浏览体验。

### 功能特性

| 功能             | 描述                                        | 状态      |
| ---------------- | ------------------------------------------- | --------- |
| **批量分类**     | 一键智能分类书签栏中的所有书签              | ✅ 已实现 |
| **自动分类**     | 新建书签自动分类到合适文件夹                | ✅ 已实现 |
| **AI 模型支持**  | 支持 OpenAI、DeepSeek、智谱 AI 及自定义端点 | ✅ 已实现 |
| **备份恢复**     | 内置书签备份和恢复功能                      | ✅ 已实现 |
| **自定义提示词** | 可自定义 AI 提示词以优化分类效果            | ✅ 已实现 |

### 安装指南

#### 方法一：加载已解压的扩展程序（开发者模式）

1. **下载扩展**
   - 克隆或下载本项目到本地

2. **打开浏览器扩展管理页面**
   - **Chrome**: 访问 `chrome://extensions/`
   - **Edge**: 访问 `edge://extensions/`

3. **启用开发者模式**
   - 在右上角开启"开发者模式"开关

4. **加载扩展**
   - 点击"加载已解压的扩展程序"
   - 选择 `AIMark` 文件夹

5. **配置 AI 设置**
   - 点击浏览器工具栏中的扩展图标
   - 打开管理界面
   - 配置 AI API 密钥和端点

### 使用方法

#### 批量分类书签

1. 点击浏览器工具栏中的扩展图标
2. 点击"打开管理界面"进入管理页面
3. 进入"书签"页面
4. 点击"整理书签"按钮
5. 确认备份提示（建议先备份）
6. 等待 AI 分类过程完成

#### 自动分类设置

1. 打开管理界面
2. 进入"设置"页面
3. 开启"实时分类"开关
4. 配置 AI API 设置
5. 新建书签将自动分类

### 配置说明

#### AI 设置

| 设置项          | 描述                 | 默认值        |
| --------------- | -------------------- | ------------- |
| **API 密钥**    | AI 服务商的 API 密钥 | -             |
| **API 端点**    | API 接口地址         | -             |
| **模型名称**    | AI 模型名称          | deepseek-chat |
| **Temperature** | 响应随机性（0-2）    | 0.3           |

#### 分类设置

| 设置项           | 描述                     | 默认值 |
| ---------------- | ------------------------ | ------ |
| **最大文件夹数** | 分类文件夹数量上限       | 10     |
| **最大层级深度** | 文件夹嵌套深度上限       | 2      |
| **批次大小**     | 单次 AI 请求处理的书签数 | 30     |
| **自动分类**     | 启用新建书签自动分类     | 开启   |
| **显示通知**     | 显示操作完成通知         | 开启   |

#### 支持的 AI 服务商

| 服务商       | 端点地址                                                | 推荐指数                   |
| ------------ | ------------------------------------------------------- | -------------------------- |
| **DeepSeek** | `https://api.deepseek.com/v1/chat/completions`          | ⭐ 性价比高                |
| **智谱 AI**  | `https://open.bigmodel.cn/api/paas/v4/chat/completions` | ⭐ 国内直连                |
| **OpenAI**   | `https://api.openai.com/v1/chat/completions`            | GPT 系列模型               |
| **自定义**   | 您的自定义端点                                          | 任何兼容 OpenAI 格式的 API |

### 项目结构

```
AIMark/
├── background.js           # Service Worker 入口
├── popup.html/popup.js     # 弹出窗口 UI
├── manager.html/manager.js # 管理页面 UI
├── components/             # UI 组件
│   ├── bookmarkTree.js     # 书签树组件
│   └── classificationFlow.js
├── modules/                # 核心模块
│   ├── bookmarkMonitor.js  # 书签事件监控
│   ├── aiClassifier.js     # AI 分类逻辑
│   ├── configManager.js    # 配置管理
│   ├── promptManager.js    # 提示词模板管理
│   └── bookmarkCache.js    # 书签缓存
├── prompts/                # AI 提示词模板
│   ├── system.json
│   ├── classification/
│   └── single/
├── icons/                  # 扩展图标
└── manifest.json           # 扩展清单
```

### 常见问题

<details>
<summary><b>Q: 支持哪些浏览器？</b></summary>

A: AIMark 支持 Chrome 和 Edge 浏览器，需要支持 Manifest V3。

</details>

<details>
<summary><b>Q: 我的书签数据安全吗？</b></summary>

A: 安全！您的书签数据仅在您主动请求分类时发送给 AI API。API 密钥存储在浏览器本地，从不上传到任何服务器。

</details>

<details>
<summary><b>Q: 支持哪些 AI 模型？</b></summary>

A: AIMark 支持任何具有 OpenAI 兼容 API 的 AI 模型，包括 DeepSeek、OpenAI GPT、智谱 AI 以及自定义端点。

</details>

<details>
<summary><b>Q: 分类准确率如何？</b></summary>

A: 分类准确率取决于所使用的 AI 模型。我们推荐使用 DeepSeek 或 GPT-4 以获得最佳效果。您也可以自定义提示词以优化分类效果。

</details>

<details>
<summary><b>Q: 可以撤销分类吗？</b></summary>

A: 可以！在分类前使用内置的备份功能。您可以在"备份"页面从任何之前的备份中恢复书签。

</details>

### 开发指南

#### 环境要求

- 支持 Manifest V3 的现代浏览器
- AI API 密钥（DeepSeek、OpenAI 等）

#### 本地开发

```bash
# 克隆仓库
git clone https://github.com/your-username/AIMark.git

# 进入项目目录
cd AIMark

# 以开发者模式加载扩展
# 参见上方安装指南
```

### 参与贡献

欢迎贡献代码！请随时提交 Pull Request。

### 许可证

本项目采用 MIT 许可证。

---

<p align="center">
  Made with ❤️ by AI
</p>
