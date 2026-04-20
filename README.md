# AIMark - AI-Powered Bookmark Classifier

<p align="center">
  <img src="icons/icon128.png" alt="AIMark Logo" width="128" height="128">
</p>

<p align="center">
  <strong>Smart Bookmark Management Powered by AI</strong>
</p>

<p align="center">
  <a href="#">English</a> | <a href="README_CN.md">中文</a>
</p>

---

### Overview

**AIMark** is an intelligent browser extension that automatically organizes and classifies your bookmarks using AI technology. Say goodbye to cluttered bookmark bars and hello to a neatly organized browsing experience.

### Features

| Feature                  | Description                                                             | Status         |
| ------------------------ | ----------------------------------------------------------------------- | -------------- |
| **Batch Classification** | Intelligently classify all bookmarks in the bookmark bar with one click | ✅ Implemented |
| **Auto Classification**  | Automatically classify newly created bookmarks                          | ✅ Implemented |
| **AI Model Support**     | Support for OpenAI, DeepSeek, Zhipu AI, and custom endpoints            | ✅ Implemented |
| **Backup & Restore**     | Built-in bookmark backup and restore functionality                      | ✅ Implemented |
| **Custom Prompts**       | Customizable AI prompts for better classification                       | ✅ Implemented |

### Installation

#### Method 1: Load Unpacked Extension (Developer Mode)

1. **Download the Extension**
   - Clone or download this repository to your local machine

2. **Open Browser Extensions Page**
   - **Chrome**: Navigate to `chrome://extensions/`
   - **Edge**: Navigate to `edge://extensions/`

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner

4. **Load the Extension**
   - Click "Load unpacked"
   - Select the `AIMark` folder

5. **Configure AI Settings**
   - Click the extension icon in the toolbar
   - Open the management interface
   - Configure your AI API key and endpoint

### Usage

#### Batch Classification

1. Click the extension icon in the browser toolbar
2. Click "Open Manager" to enter the management interface
3. Navigate to the "Bookmarks" page
4. Click "Organize Bookmarks" button
5. Confirm the backup prompt (recommended)
6. Wait for the AI classification process to complete

#### Auto Classification

1. Open the management interface
2. Go to "Settings" page
3. Enable "Auto Classification" toggle
4. Configure your AI API settings
5. New bookmarks will be automatically classified

### Configuration

#### AI Settings

| Setting          | Description                | Default       |
| ---------------- | -------------------------- | ------------- |
| **API Key**      | Your AI provider's API key | -             |
| **API Endpoint** | The API endpoint URL       | -             |
| **Model**        | AI model name              | deepseek-chat |
| **Temperature**  | Response randomness (0-2)  | 0.3           |

#### Classification Settings

| Setting                | Description                                  | Default |
| ---------------------- | -------------------------------------------- | ------- |
| **Max Folders**        | Maximum number of classification folders     | 10      |
| **Max Depth**          | Maximum folder nesting depth                 | 2       |
| **Batch Size**         | Number of bookmarks per AI request           | 30      |
| **Auto Classify**      | Enable auto-classification for new bookmarks | true    |
| **Show Notifications** | Display completion notifications             | true    |

#### Supported AI Providers

| Provider     | Endpoint                                                | Recommended               |
| ------------ | ------------------------------------------------------- | ------------------------- |
| **DeepSeek** | `https://api.deepseek.com/v1/chat/completions`          | ⭐ High cost-performance  |
| **Zhipu AI** | `https://open.bigmodel.cn/api/paas/v4/chat/completions` | ⭐ China direct access    |
| **OpenAI**   | `https://api.openai.com/v1/chat/completions`            | GPT series models         |
| **Custom**   | Your custom endpoint                                    | Any OpenAI-compatible API |

### Project Structure

```
AIMark/
├── background.js           # Service Worker entry point
├── popup.html/popup.js     # Popup window UI
├── manager.html/manager.js # Management page UI
├── components/             # UI components
│   ├── bookmarkTree.js     # Bookmark tree component
│   └── classificationFlow.js
├── modules/                # Core modules
│   ├── bookmarkMonitor.js  # Bookmark event monitoring
│   ├── aiClassifier.js     # AI classification logic
│   ├── configManager.js    # Configuration management
│   ├── promptManager.js    # Prompt template management
│   └── bookmarkCache.js    # Bookmark caching
├── prompts/                # AI prompt templates
│   ├── system.json
│   ├── classification/
│   └── single/
├── icons/                  # Extension icons
└── manifest.json           # Extension manifest
```

### FAQ

<details>
<summary><b>Q: Which browsers are supported?</b></summary>

A: AIMark supports Chrome and Edge browsers with Manifest V3 support.

</details>

<details>
<summary><b>Q: Is my bookmark data safe?</b></summary>

A: Yes! Your bookmark data is only sent to the AI API when you explicitly request classification. API keys are stored locally in your browser and never uploaded to any server.

</details>

<details>
<summary><b>Q: What AI models are supported?</b></summary>

A: AIMark supports any AI model with an OpenAI-compatible API, including DeepSeek, OpenAI GPT, Zhipu AI, and custom endpoints.

</details>

<details>
<summary><b>Q: How accurate is the classification?</b></summary>

A: Classification accuracy depends on the AI model used. We recommend using DeepSeek or GPT-4 for best results. You can also customize prompts for better classification.

</details>

<details>
<summary><b>Q: Can I undo the classification?</b></summary>

A: Yes! Use the built-in backup feature before classification. You can restore bookmarks from any previous backup in the "Backup" page.

</details>

### Development

#### Prerequisites

- Modern browser with Manifest V3 support
- AI API key (DeepSeek, OpenAI, etc.)

#### Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/AIMark.git

# Navigate to the project directory
cd AIMark

# Load the extension in developer mode
# See Installation section above
```

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### License

This project is licensed under the MIT License.

---

<p align="center">
  Made with ❤️ by AI
</p>
