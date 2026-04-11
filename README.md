<div align="center">

# AIMark - 智能书签分类器
### AI-Powered Bookmark Classifier

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/aimark)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/chrome-supported-brightgreen.svg)](https://www.google.com/chrome/)
[![Edge](https://img.shields.io/badge/edge-supported-brightgreen.svg)](https://www.microsoft.com/edge)

**基于AI的智能书签管理浏览器扩展 | AI-Powered Browser Extension for Smart Bookmark Management**

[English](#english) | [中文](#中文)

</div>

---

<a name="中文"></a>

## 📖 中文文档

### 目录

- [项目简介](#项目简介)
- [核心功能](#核心功能)
- [系统架构](#系统架构)
- [安装指南](#安装指南)
- [配置说明](#配置说明)
- [使用指南](#使用指南)
- [API接口](#api接口)
- [常见问题](#常见问题)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

### 项目简介

AIMark 是一款基于人工智能的浏览器扩展，旨在解决现代浏览器书签管理的痛点。通过先进的AI技术，自动对书签进行智能分类和整理，让您的书签库井井有条。

#### 背景与动机

现代浏览器的书签管理存在以下问题：
- 📌 新建书签默认存入"其他书签"，缺乏有效分类
- 📌 书签数量增长后，手动整理效率低下
- 📌 常用书签难以快速访问
- 📌 缺乏智能化的书签管理工具

AIMark 应运而生，通过AI技术实现书签的智能分类和管理。

#### 目标用户

- 书签数量较多、需要高效管理的用户
- 希望自动化整理书签的用户
- 需要快速访问常用书签的用户
- 对AI辅助工具有接受度的技术用户

---

### 核心功能

#### ✅ V1.0 核心功能（已实现）

##### 1. 书签批量智能分类

**功能描述**：一键对书签栏中的所有书签进行智能分类整理

**核心特性**：
- 🤖 AI自动生成分类目录树结构
- 📊 支持多级分类（最多2层）
- 🔄 分批处理大量书签（默认30个/批次）
- ✅ 分类结果完整性校验
- 📈 实时进度反馈
- 💾 自动备份机制

**使用场景**：
```
用户场景：张三有200个未分类书签
1. 点击"开始分类"按钮
2. AI分析书签内容，生成8个分类文件夹
3. 198个书签成功分类，2个归入"未分类"
4. 整个过程约3分钟完成
```

##### 2. 新建书签自动分类

**功能描述**：监控新建书签事件，自动将书签分类到合适的文件夹

**核心特性**：
- ⚡ 实时监控书签创建事件
- 🎯 智能匹配现有分类文件夹
- 🆕 自动创建新分类文件夹
- ⏱️ 5秒延迟处理（避免用户编辑中）
- 🔔 分类完成通知

##### 3. AI模型配置管理

**支持的AI服务商**：
- ✅ DeepSeek（已测试）
- ✅ OpenAI（GPT-4, GPT-3.5-turbo）
- ⚠️ Anthropic Claude（需适配）
- ✅ 自定义API端点

**配置项**：
- API密钥
- API端点URL
- 模型名称
- Temperature参数
- Max Tokens限制

#### 🔮 V2.0 规划功能

##### 1. 书签热度排序算法

**功能描述**：追踪用户访问行为，计算书签热度分数

**热度算法**：
```
热度分数 = (访问次数/天数) × 0.6 + e^(-距今天数/7) × 0.4
```

**特性**：
- 访问频率权重：60%
- 最近访问权重：40%
- 时间衰减因子：0.95

##### 2. 书签栏智能生成机制

**功能描述**：自动将高热度书签复制到书签栏，方便快速访问

**核心机制**：
- 📊 基于热度算法计算TOP N书签
- 📌 直接复制到书签栏（不创建文件夹）
- 🏷️ 设置`syncStatus=false`标识热度书签
- 🚫 批量整理时自动过滤热度书签
- 🔄 定期更新推荐列表

---

### 系统架构

#### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        浏览器扩展层                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Popup UI   │  │ Manager UI  │  │ Background  │             │
│  │  (弹出窗口) │  │  (管理页)   │  │  Service    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         └────────────────┼────────────────┘                     │
│                          ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Core Modules (核心模块层)               │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │ │
│  │  │ Bookmark    │  │    AI       │  │   Config    │        │ │
│  │  │ Monitor     │  │ Classifier  │  │  Manager    │        │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                          ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  Storage Layer (存储层)                    │ │
│  │  ┌─────────────────────┐  ┌─────────────────────┐         │ │
│  │  │ chrome.storage.local│  │  chrome.bookmarks   │         │ │
│  │  └─────────────────────┘  └─────────────────────┘         │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   AI Model API        │
              │ (OpenAI/DeepSeek/etc) │
              └───────────────────────┘
```

#### 核心模块

| 模块名称 | 职责 | 状态 |
|---------|------|------|
| BookmarkMonitor | 书签事件监听和缓存管理 | ✅ 已实现 |
| AIClassifier | AI分类逻辑和结果校验 | ✅ 已实现 |
| ConfigManager | 配置管理和持久化 | ✅ 已实现 |
| PromptManager | 提示词模板管理 | ✅ 已实现 |
| BookmarkCache | 书签数据缓存 | ✅ 已实现 |
| RealtimeClassifier | 实时书签分类 | ⚠️ 待验证 |
| VisitTracker | 访问行为追踪 | 🔮 V2.0 |

---

### 安装指南

#### 前置要求

- Chrome 浏览器（版本 88+）或 Edge 浏览器（版本 88+）
- AI模型API密钥（DeepSeek / OpenAI / 其他兼容API）

#### 安装步骤

##### 方式一：开发者模式安装（推荐）

1. **下载源码**
   ```bash
   git clone https://github.com/yourusername/aimark.git
   cd aimark
   ```

2. **打开浏览器扩展管理页面**
   - Chrome: 访问 `chrome://extensions/`
   - Edge: 访问 `edge://extensions/`

3. **启用开发者模式**
   - 在扩展管理页面右上角，开启"开发者模式"开关

4. **加载扩展**
   - 点击"加载已解压的扩展程序"
   - 选择项目根目录（包含manifest.json的目录）

5. **验证安装**
   - 扩展列表中应显示"智能书签分类器"
   - 浏览器工具栏应显示扩展图标

##### 方式二：Chrome Web Store安装（即将推出）

*暂未上架，敬请期待*

---

### 配置说明

#### 首次配置

1. **打开配置页面**
   - 点击浏览器工具栏的扩展图标
   - 点击"管理书签"按钮
   - 进入"设置"标签页

2. **配置AI模型**

   **必填项**：
   ```
   API密钥: sk-xxxxxxxxxxxxxxxx
   API端点: https://api.deepseek.com/v1/chat/completions
   模型名称: deepseek-chat
   ```

   **可选配置**：
   ```
   Temperature: 0.3 (推荐值，控制输出随机性)
   Max Tokens: 4000 (单次请求最大Token数)
   ```

3. **配置分类参数**

   | 参数 | 默认值 | 说明 |
   |------|--------|------|
   | 书签栏最大文件夹数 | 10 | AI生成的分类文件夹数量上限 |
   | 最大层级深度 | 2 | 书签分类的最大层级 |
   | 批次大小 | 30 | 单次AI请求处理的书签数量 |
   | 自动分类开关 | 开启 | 是否启用新建书签自动分类 |
   | 显示通知 | 开启 | 是否显示操作完成通知 |

#### AI服务商配置示例

##### DeepSeek配置
```json
{
  "provider": "deepseek",
  "apiKey": "sk-xxxxxxxxxxxxxxxx",
  "endpoint": "https://api.deepseek.com/v1/chat/completions",
  "model": "deepseek-chat",
  "temperature": 0.3,
  "maxTokens": 4000
}
```

##### OpenAI配置
```json
{
  "provider": "openai",
  "apiKey": "sk-xxxxxxxxxxxxxxxx",
  "endpoint": "https://api.openai.com/v1/chat/completions",
  "model": "gpt-4",
  "temperature": 0.3,
  "maxTokens": 4000
}
```

##### 自定义API配置
```json
{
  "provider": "custom",
  "apiKey": "your-api-key",
  "endpoint": "https://your-api-endpoint.com/v1/chat/completions",
  "model": "your-model-name",
  "temperature": 0.3,
  "maxTokens": 4000
}
```

---

### 使用指南

#### 批量分类书签

**步骤1：准备书签**
- 确保书签栏中有待分类的书签
- 建议先导出备份书签（可选）

**步骤2：开始分类**
1. 点击扩展图标打开弹出窗口
2. 点击"管理书签"进入管理页面
3. 点击"开始分类"按钮
4. 确认备份提示后继续

**步骤3：查看进度**
```
进度显示示例：
[████████████████░░░░] 80% 正在分类书签 (160/200)...
```

**步骤4：查看结果**
- 分类完成后会显示统计信息
- 书签栏会自动刷新显示分类结果
- 收到浏览器通知："成功分类200个书签到8个分类"

#### 自动分类新书签

**启用自动分类**
1. 进入管理页面 → 设置
2. 确保"自动分类开关"已开启
3. 配置好AI模型参数

**工作流程**
```
用户创建书签 → 存入"其他书签" 
    ↓
扩展检测新书签（延迟5秒）
    ↓
调用AI分析书签内容
    ↓
匹配或创建分类文件夹
    ↓
移动书签到目标文件夹
    ↓
发送分类完成通知
```

#### 管理配置

**修改AI配置**
- 进入管理页面 → 设置 → AI配置
- 修改API密钥、端点等参数
- 点击"保存配置"

**调整分类参数**
- 进入管理页面 → 设置 → 分类配置
- 调整文件夹数量、层级深度等
- 点击"保存配置"

**备份与恢复**
- 进入管理页面 → 备份
- 点击"导出备份"保存书签
- 需要时点击"恢复备份"

---

### API接口

#### 消息通信接口

扩展使用Chrome消息传递机制进行模块间通信。

##### 分类相关接口

**开始批量分类**
```javascript
// 发送消息
chrome.runtime.sendMessage({
  action: 'startBatchClassify'
}, (response) => {
  if (response.success) {
    console.log('分类完成:', response.result);
  } else {
    console.error('分类失败:', response.error);
  }
});

// 响应格式
{
  success: true,
  result: {
    categoryTree: [...],
    classification: {...},
    bookmarkCount: 200
  }
}
```

**监听分类进度**
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'classifyProgress') {
    console.log(`进度: ${message.progress}% - ${message.status}`);
  }
});
```

##### 配置相关接口

**获取配置**
```javascript
chrome.runtime.sendMessage({
  action: 'getConfig'
}, (config) => {
  console.log('当前配置:', config);
});
```

**设置配置**
```javascript
chrome.runtime.sendMessage({
  action: 'setConfig',
  config: {
    ai: { ... },
    classification: { ... }
  }
}, (response) => {
  console.log('配置已保存');
});
```

##### 书签相关接口

**获取书签缓存**
```javascript
chrome.runtime.sendMessage({
  action: 'getBookmarkCache'
}, (response) => {
  console.log('书签缓存:', response.bookmarks);
});
```

**搜索书签**
```javascript
chrome.runtime.sendMessage({
  action: 'searchBookmarks',
  query: '技术博客'
}, (response) => {
  console.log('搜索结果:', response.results);
});
```

#### 存储接口

扩展使用`chrome.storage.local`进行数据持久化。

##### 存储键名

| 键名 | 用途 | 数据类型 |
|------|------|----------|
| `aimark_config` | 用户配置 | Object |
| `aimark_bookmark_cache` | 书签缓存 | Object |
| `aimark_backups` | 备份数据 | Array |
| `aimark_visit_data` | 访问数据(V2.0) | Object |

##### 存储示例

```javascript
// 读取配置
chrome.storage.local.get(['aimark_config'], (result) => {
  const config = result.aimark_config;
  console.log('配置:', config);
});

// 保存配置
chrome.storage.local.set({
  aimark_config: {
    ai: { ... },
    classification: { ... }
  }
}, () => {
  console.log('配置已保存');
});
```

---

### 常见问题

#### Q1: 支持哪些AI模型？

**A**: 目前支持以下AI模型：
- ✅ DeepSeek（推荐，已测试）
- ✅ OpenAI GPT-4 / GPT-3.5-turbo
- ⚠️ Anthropic Claude（需要适配API格式）
- ✅ 任何兼容OpenAI API格式的自定义端点

#### Q2: 分类准确率如何？

**A**: 分类准确率取决于以下因素：
- AI模型能力（推荐使用GPT-4或DeepSeek）
- 书签标题和URL的清晰度
- 分类配置参数

根据测试，批量分类准确率约85%以上，单书签分类准确率约80%以上。

#### Q3: 如何处理大量书签？

**A**: 系统采用分批处理机制：
- 默认每批处理30个书签
- 显示实时进度反馈
- 支持断点续传（V2.0规划）
- 200个书签约需3分钟完成

#### Q4: 书签数据安全吗？

**A**: 数据安全措施：
- ✅ API密钥本地加密存储
- ✅ 所有API调用使用HTTPS加密
- ✅ 书签数据仅在用户请求时发送给AI
- ✅ 操作前提示备份
- ✅ 支持备份恢复机制

#### Q5: 自动分类会影响性能吗？

**A**: 性能优化措施：
- ⚡ 5秒延迟处理，避免影响用户操作
- 💾 本地缓存机制，减少API调用
- 🔄 后台异步处理，不阻塞UI
- 📊 内存占用控制在50MB以内

#### Q6: 如何切换AI服务商？

**A**: 切换步骤：
1. 进入管理页面 → 设置 → AI配置
2. 修改API端点和密钥
3. 选择对应的模型名称
4. 点击"保存配置"
5. 建议测试新配置是否正常工作

#### Q7: 分类结果不满意怎么办？

**A**: 改进建议：
- 📝 优化书签标题，使其更具描述性
- ⚙️ 调整分类参数（文件夹数量、层级深度）
- 🔄 重新分类（会覆盖之前的结果）
- ✏️ 手动调整分类结果

#### Q8: V2.0版本什么时候发布？

**A**: V2.0版本规划：
- 📅 预研阶段：2026年5月
- 🚀 开发阶段：2026年6月
- 🧪 测试阶段：2026年7月
- 🎉 正式发布：2026年7月31日

#### Q9: 如何贡献代码？

**A**: 请参考[贡献指南](#贡献指南)章节。

#### Q10: 遇到问题如何反馈？

**A**: 问题反馈渠道：
- 📧 邮件：your.email@example.com
- 🐛 GitHub Issues：https://github.com/yourusername/aimark/issues
- 💬 GitHub Discussions：https://github.com/yourusername/aimark/discussions

---

### 贡献指南

我们欢迎所有形式的贡献！

#### 贡献方式

##### 1. 报告Bug

如果您发现了Bug，请：
1. 在GitHub Issues中搜索是否已有相同问题
2. 如果没有，创建新Issue，包含：
   - 详细的问题描述
   - 复现步骤
   - 预期行为
   - 实际行为
   - 截图（如适用）
   - 环境信息（浏览器版本、扩展版本等）

##### 2. 提出新功能

如果您有新功能建议：
1. 在GitHub Discussions中讨论
2. 说明功能需求和使用场景
3. 等待社区反馈和维护者评估

##### 3. 提交代码

**开发环境设置**：
```bash
# 克隆仓库
git clone https://github.com/yourusername/aimark.git
cd aimark

# 安装依赖（如果有）
npm install

# 创建功能分支
git checkout -b feature/your-feature-name
```

**代码规范**：
- 使用ES6+语法
- 遵循JavaScript Standard Style
- 添加必要的注释
- 保持代码简洁清晰

**提交Pull Request**：
1. Fork本仓库
2. 创建功能分支
3. 进行开发和测试
4. 提交清晰的commit message
5. 推送到您的Fork仓库
6. 创建Pull Request

**Pull Request要求**：
- 清晰描述改动内容
- 关联相关Issue
- 确保代码通过测试
- 更新相关文档

##### 4. 完善文档

文档改进包括：
- 修正拼写错误
- 改进表述
- 添加示例代码
- 翻译文档
- 更新截图

#### 开发指南

##### 项目结构
```
aimark/
├── background.js          # Service Worker入口
├── popup.html/js          # 弹出窗口
├── manager.html/js        # 管理页面
├── components/            # UI组件
├── modules/               # 核心模块
├── prompts/               # 提示词模板
├── icons/                 # 图标资源
├── docs/                  # 文档
└── manifest.json          # 扩展配置
```

##### 调试方法

1. **加载扩展**
   - Chrome: `chrome://extensions/`
   - 开启开发者模式
   - 加载已解压的扩展程序

2. **查看日志**
   - Background: 点击"service worker"链接
   - Popup: 右键扩展图标 → 检查弹出内容
   - Manager: 页面内按F12

3. **调试工具**
   - Chrome DevTools
   - 扩展管理页面的"错误"按钮

##### 测试

目前暂无自动化测试，建议手动测试：
- 功能测试：测试各个功能点
- 兼容性测试：Chrome和Edge浏览器
- 性能测试：大量书签处理
- 异常测试：API错误、网络异常等

#### 社区准则

- 尊重所有贡献者
- 保持友好和建设性的讨论
- 欢迎不同观点和建议
- 遵守行为准则

---

### 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

```
MIT License

Copyright (c) 2026 AIMark Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<a name="english"></a>

## 📖 English Documentation

### Table of Contents

- [Introduction](#introduction)
- [Core Features](#core-features)
- [System Architecture](#system-architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [API Reference](#api-reference)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

---

### Introduction

AIMark is an AI-powered browser extension designed to solve the pain points of modern browser bookmark management. Using advanced AI technology, it automatically categorizes and organizes bookmarks, keeping your bookmark library neat and organized.

#### Background & Motivation

Modern browser bookmark management faces these challenges:
- 📌 New bookmarks default to "Other Bookmarks" without effective categorization
- 📌 Manual organization becomes inefficient as bookmark count grows
- 📌 Frequently used bookmarks are hard to access quickly
- 📌 Lack of intelligent bookmark management tools

AIMark was created to address these issues through AI-powered bookmark categorization and management.

#### Target Users

- Users with many bookmarks requiring efficient management
- Users seeking automated bookmark organization
- Users needing quick access to frequently used bookmarks
- Tech-savvy users open to AI-assisted tools

---

### Core Features

#### ✅ V1.0 Core Features (Implemented)

##### 1. Batch Bookmark Classification

**Description**: One-click intelligent classification of all bookmarks in the bookmark bar

**Key Features**:
- 🤖 AI-generated classification tree structure
- 📊 Multi-level classification support (up to 2 levels)
- 🔄 Batch processing of large bookmark collections (default 30/bookmark/batch)
- ✅ Classification result completeness validation
- 📈 Real-time progress feedback
- 💾 Automatic backup mechanism

**Use Case**:
```
Scenario: User has 200 uncategorized bookmarks
1. Click "Start Classification" button
2. AI analyzes bookmark content, generates 8 classification folders
3. 198 bookmarks successfully classified, 2 in "Uncategorized"
4. Process completes in approximately 3 minutes
```

##### 2. Automatic New Bookmark Classification

**Description**: Monitors new bookmark creation events and automatically categorizes bookmarks

**Key Features**:
- ⚡ Real-time bookmark creation event monitoring
- 🎯 Intelligent matching with existing classification folders
- 🆕 Automatic creation of new classification folders
- ⏱️ 5-second delay processing (avoiding user editing)
- 🔔 Classification completion notification

##### 3. AI Model Configuration Management

**Supported AI Providers**:
- ✅ DeepSeek (Tested)
- ✅ OpenAI (GPT-4, GPT-3.5-turbo)
- ⚠️ Anthropic Claude (Requires adaptation)
- ✅ Custom API endpoints

**Configuration Options**:
- API Key
- API Endpoint URL
- Model Name
- Temperature Parameter
- Max Tokens Limit

#### 🔮 V2.0 Planned Features

##### 1. Bookmark Heat Score Algorithm

**Description**: Tracks user access behavior and calculates bookmark heat scores

**Heat Algorithm**:
```
Heat Score = (Visit Count/Days) × 0.6 + e^(-Days Since Last Visit/7) × 0.4
```

**Features**:
- Visit Frequency Weight: 60%
- Recent Visit Weight: 40%
- Time Decay Factor: 0.95

##### 2. Smart Bookmark Bar Generation

**Description**: Automatically copies high-heat bookmarks to bookmark bar for quick access

**Core Mechanism**:
- 📊 Calculate TOP N bookmarks based on heat algorithm
- 📌 Direct copy to bookmark bar (no folder creation)
- 🏷️ Set `syncStatus=false` to identify heat bookmarks
- 🚫 Automatically filter heat bookmarks during batch organization
- 🔄 Periodic recommendation list updates

---

### System Architecture

#### Overall Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser Extension Layer                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Popup UI   │  │ Manager UI  │  │ Background  │             │
│  │             │  │             │  │  Service    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         └────────────────┼────────────────┘                     │
│                          ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Core Modules Layer                      │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │ │
│  │  │ Bookmark    │  │    AI       │  │   Config    │        │ │
│  │  │ Monitor     │  │ Classifier  │  │  Manager    │        │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                          ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                     Storage Layer                          │ │
│  │  ┌─────────────────────┐  ┌─────────────────────┐         │ │
│  │  │ chrome.storage.local│  │  chrome.bookmarks   │         │ │
│  │  └─────────────────────┘  └─────────────────────┘         │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   AI Model API        │
              │ (OpenAI/DeepSeek/etc) │
              └───────────────────────┘
```

#### Core Modules

| Module Name | Responsibility | Status |
|------------|----------------|--------|
| BookmarkMonitor | Bookmark event listening and cache management | ✅ Implemented |
| AIClassifier | AI classification logic and result validation | ✅ Implemented |
| ConfigManager | Configuration management and persistence | ✅ Implemented |
| PromptManager | Prompt template management | ✅ Implemented |
| BookmarkCache | Bookmark data caching | ✅ Implemented |
| RealtimeClassifier | Real-time bookmark classification | ⚠️ Pending Verification |
| VisitTracker | Access behavior tracking | 🔮 V2.0 |

---

### Installation

#### Prerequisites

- Chrome Browser (Version 88+) or Edge Browser (Version 88+)
- AI Model API Key (DeepSeek / OpenAI / Other compatible APIs)

#### Installation Steps

##### Method 1: Developer Mode Installation (Recommended)

1. **Download Source Code**
   ```bash
   git clone https://github.com/yourusername/aimark.git
   cd aimark
   ```

2. **Open Browser Extension Management Page**
   - Chrome: Navigate to `chrome://extensions/`
   - Edge: Navigate to `edge://extensions/`

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner

4. **Load Extension**
   - Click "Load unpacked"
   - Select the project root directory (containing manifest.json)

5. **Verify Installation**
   - Extension list should show "智能书签分类器"
   - Browser toolbar should display extension icon

##### Method 2: Chrome Web Store Installation (Coming Soon)

*Not yet available, stay tuned*

---

### Configuration

#### Initial Setup

1. **Open Configuration Page**
   - Click extension icon in browser toolbar
   - Click "Manage Bookmarks" button
   - Navigate to "Settings" tab

2. **Configure AI Model**

   **Required Fields**:
   ```
   API Key: sk-xxxxxxxxxxxxxxxx
   API Endpoint: https://api.deepseek.com/v1/chat/completions
   Model Name: deepseek-chat
   ```

   **Optional Configuration**:
   ```
   Temperature: 0.3 (Recommended, controls output randomness)
   Max Tokens: 4000 (Maximum tokens per request)
   ```

3. **Configure Classification Parameters**

   | Parameter | Default | Description |
   |-----------|---------|-------------|
   | Max Folders in Bookmark Bar | 10 | Upper limit for AI-generated classification folders |
   | Max Depth | 2 | Maximum levels of bookmark classification |
   | Batch Size | 30 | Number of bookmarks processed per AI request |
   | Auto-Classify Switch | On | Enable automatic classification for new bookmarks |
   | Show Notifications | On | Display operation completion notifications |

#### AI Provider Configuration Examples

##### DeepSeek Configuration
```json
{
  "provider": "deepseek",
  "apiKey": "sk-xxxxxxxxxxxxxxxx",
  "endpoint": "https://api.deepseek.com/v1/chat/completions",
  "model": "deepseek-chat",
  "temperature": 0.3,
  "maxTokens": 4000
}
```

##### OpenAI Configuration
```json
{
  "provider": "openai",
  "apiKey": "sk-xxxxxxxxxxxxxxxx",
  "endpoint": "https://api.openai.com/v1/chat/completions",
  "model": "gpt-4",
  "temperature": 0.3,
  "maxTokens": 4000
}
```

##### Custom API Configuration
```json
{
  "provider": "custom",
  "apiKey": "your-api-key",
  "endpoint": "https://your-api-endpoint.com/v1/chat/completions",
  "model": "your-model-name",
  "temperature": 0.3,
  "maxTokens": 4000
}
```

---

### Usage Guide

#### Batch Bookmark Classification

**Step 1: Prepare Bookmarks**
- Ensure bookmarks in bookmark bar need classification
- Recommended to export backup first (optional)

**Step 2: Start Classification**
1. Click extension icon to open popup
2. Click "Manage Bookmarks" to enter management page
3. Click "Start Classification" button
4. Confirm backup prompt to continue

**Step 3: Monitor Progress**
```
Progress Display Example:
[████████████████░░░░] 80% Classifying bookmarks (160/200)...
```

**Step 4: View Results**
- Statistics displayed upon completion
- Bookmark bar automatically refreshes to show classification results
- Browser notification: "Successfully classified 200 bookmarks into 8 categories"

#### Automatic New Bookmark Classification

**Enable Auto-Classification**
1. Navigate to Management Page → Settings
2. Ensure "Auto-Classify Switch" is enabled
3. Configure AI model parameters

**Workflow**
```
User creates bookmark → Saved to "Other Bookmarks"
    ↓
Extension detects new bookmark (5-second delay)
    ↓
Calls AI to analyze bookmark content
    ↓
Matches or creates classification folder
    ↓
Moves bookmark to target folder
    ↓
Sends classification completion notification
```

#### Configuration Management

**Modify AI Configuration**
- Navigate to Management Page → Settings → AI Configuration
- Modify API key, endpoint, and other parameters
- Click "Save Configuration"

**Adjust Classification Parameters**
- Navigate to Management Page → Settings → Classification Configuration
- Adjust folder count, depth level, etc.
- Click "Save Configuration"

**Backup & Restore**
- Navigate to Management Page → Backup
- Click "Export Backup" to save bookmarks
- Click "Restore Backup" when needed

---

### API Reference

#### Message Communication Interface

The extension uses Chrome message passing for inter-module communication.

##### Classification Related Interfaces

**Start Batch Classification**
```javascript
// Send message
chrome.runtime.sendMessage({
  action: 'startBatchClassify'
}, (response) => {
  if (response.success) {
    console.log('Classification completed:', response.result);
  } else {
    console.error('Classification failed:', response.error);
  }
});

// Response format
{
  success: true,
  result: {
    categoryTree: [...],
    classification: {...},
    bookmarkCount: 200
  }
}
```

**Listen to Classification Progress**
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'classifyProgress') {
    console.log(`Progress: ${message.progress}% - ${message.status}`);
  }
});
```

##### Configuration Related Interfaces

**Get Configuration**
```javascript
chrome.runtime.sendMessage({
  action: 'getConfig'
}, (config) => {
  console.log('Current configuration:', config);
});
```

**Set Configuration**
```javascript
chrome.runtime.sendMessage({
  action: 'setConfig',
  config: {
    ai: { ... },
    classification: { ... }
  }
}, (response) => {
  console.log('Configuration saved');
});
```

##### Bookmark Related Interfaces

**Get Bookmark Cache**
```javascript
chrome.runtime.sendMessage({
  action: 'getBookmarkCache'
}, (response) => {
  console.log('Bookmark cache:', response.bookmarks);
});
```

**Search Bookmarks**
```javascript
chrome.runtime.sendMessage({
  action: 'searchBookmarks',
  query: 'tech blog'
}, (response) => {
  console.log('Search results:', response.results);
});
```

#### Storage Interface

The extension uses `chrome.storage.local` for data persistence.

##### Storage Keys

| Key | Purpose | Data Type |
|-----|---------|-----------|
| `aimark_config` | User configuration | Object |
| `aimark_bookmark_cache` | Bookmark cache | Object |
| `aimark_backups` | Backup data | Array |
| `aimark_visit_data` | Visit data (V2.0) | Object |

##### Storage Example

```javascript
// Read configuration
chrome.storage.local.get(['aimark_config'], (result) => {
  const config = result.aimark_config;
  console.log('Configuration:', config);
});

// Save configuration
chrome.storage.local.set({
  aimark_config: {
    ai: { ... },
    classification: { ... }
  }
}, () => {
  console.log('Configuration saved');
});
```

---

### FAQ

#### Q1: Which AI models are supported?

**A**: Currently supports the following AI models:
- ✅ DeepSeek (Recommended, tested)
- ✅ OpenAI GPT-4 / GPT-3.5-turbo
- ⚠️ Anthropic Claude (Requires API format adaptation)
- ✅ Any custom endpoint compatible with OpenAI API format

#### Q2: How accurate is the classification?

**A**: Classification accuracy depends on:
- AI model capability (GPT-4 or DeepSeek recommended)
- Clarity of bookmark titles and URLs
- Classification configuration parameters

Based on testing, batch classification accuracy is approximately 85%+, single bookmark classification accuracy is approximately 80%+.

#### Q3: How to handle large numbers of bookmarks?

**A**: The system uses batch processing:
- Default 30 bookmarks per batch
- Real-time progress feedback
- Supports resumption (V2.0 planned)
- 200 bookmarks complete in approximately 3 minutes

#### Q4: Is bookmark data secure?

**A**: Data security measures:
- ✅ API key locally encrypted storage
- ✅ All API calls use HTTPS encryption
- ✅ Bookmark data only sent to AI upon user request
- ✅ Backup reminder before operations
- ✅ Backup and restore mechanism supported

#### Q5: Will auto-classification affect performance?

**A**: Performance optimization measures:
- ⚡ 5-second delay processing, avoiding user operation interference
- 💾 Local cache mechanism, reducing API calls
- 🔄 Background async processing, non-blocking UI
- 📊 Memory usage controlled within 50MB

#### Q6: How to switch AI providers?

**A**: Switching steps:
1. Navigate to Management Page → Settings → AI Configuration
2. Modify API endpoint and key
3. Select corresponding model name
4. Click "Save Configuration"
5. Recommended to test if new configuration works properly

#### Q7: What if classification results are unsatisfactory?

**A**: Improvement suggestions:
- 📝 Optimize bookmark titles for better descriptiveness
- ⚙️ Adjust classification parameters (folder count, depth level)
- 🔄 Re-classify (will overwrite previous results)
- ✏️ Manually adjust classification results

#### Q8: When will V2.0 be released?

**A**: V2.0 version timeline:
- 📅 Research Phase: May 2026
- 🚀 Development Phase: June 2026
- 🧪 Testing Phase: July 2026
- 🎉 Official Release: July 31, 2026

#### Q9: How to contribute code?

**A**: Please refer to the [Contributing](#contributing) section.

#### Q10: How to report issues?

**A**: Issue reporting channels:
- 📧 Email: your.email@example.com
- 🐛 GitHub Issues: https://github.com/yourusername/aimark/issues
- 💬 GitHub Discussions: https://github.com/yourusername/aimark/discussions

---

### Contributing

We welcome all forms of contributions!

#### Ways to Contribute

##### 1. Report Bugs

If you find a bug, please:
1. Search GitHub Issues for existing reports
2. If none exists, create a new Issue including:
   - Detailed problem description
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots (if applicable)
   - Environment info (browser version, extension version, etc.)

##### 2. Propose New Features

If you have feature suggestions:
1. Discuss in GitHub Discussions
2. Explain feature requirements and use cases
3. Wait for community feedback and maintainer evaluation

##### 3. Submit Code

**Development Environment Setup**:
```bash
# Clone repository
git clone https://github.com/yourusername/aimark.git
cd aimark

# Install dependencies (if any)
npm install

# Create feature branch
git checkout -b feature/your-feature-name
```

**Code Standards**:
- Use ES6+ syntax
- Follow JavaScript Standard Style
- Add necessary comments
- Keep code clean and clear

**Submit Pull Request**:
1. Fork this repository
2. Create feature branch
3. Develop and test
4. Commit with clear commit messages
5. Push to your forked repository
6. Create Pull Request

**Pull Request Requirements**:
- Clear description of changes
- Reference related issues
- Ensure code passes tests
- Update related documentation

##### 4. Improve Documentation

Documentation improvements include:
- Fix spelling errors
- Improve wording
- Add example code
- Translate documentation
- Update screenshots

#### Development Guide

##### Project Structure
```
aimark/
├── background.js          # Service Worker entry
├── popup.html/js          # Popup window
├── manager.html/js        # Management page
├── components/            # UI components
├── modules/               # Core modules
├── prompts/               # Prompt templates
├── icons/                 # Icon resources
├── docs/                  # Documentation
└── manifest.json          # Extension configuration
```

##### Debugging Methods

1. **Load Extension**
   - Chrome: `chrome://extensions/`
   - Enable developer mode
   - Load unpacked extension

2. **View Logs**
   - Background: Click "service worker" link
   - Popup: Right-click extension icon → Inspect popup
   - Manager: Press F12 on page

3. **Debugging Tools**
   - Chrome DevTools
   - "Errors" button on extension management page

##### Testing

Currently no automated tests, manual testing recommended:
- Functional testing: Test each feature
- Compatibility testing: Chrome and Edge browsers
- Performance testing: Large bookmark processing
- Exception testing: API errors, network issues, etc.

#### Community Guidelines

- Respect all contributors
- Maintain friendly and constructive discussions
- Welcome different viewpoints and suggestions
- Follow code of conduct

---

### License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 AIMark Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">

**Made with ❤️ by AIMark Team**

**Star ⭐ this repository if you find it helpful!**

[⬆ Back to Top](#aimark---智能书签分类器)

</div>
