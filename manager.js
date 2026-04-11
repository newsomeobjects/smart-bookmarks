const PROVIDERS = {
    deepseek: {
        name: 'DeepSeek',
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        model: 'deepseek-chat'
    },
    zhipu: {
        name: '智谱AI',
        endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        model: 'glm-4-flash'
    },
    openai: {
        name: 'OpenAI',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini'
    },
    custom: {
        name: '自定义',
        endpoint: '',
        model: ''
    }
};

const DEFAULT_PROMPTS = {
    system: `你是一个专业的书签分类助手。你的任务是帮助用户整理和分类书签。

规则：
1. 分类名称必须简洁，2-6个中文字符或2-10个英文字符
2. 分类名称不能包含URL、特殊字符或数字开头
3. 优先使用已有的分类名称
4. 如果需要创建新分类，确保分类名称具有通用性和可理解性
5. 返回的JSON格式必须严格符合要求
6. 不要添加任何解释性文字，只返回JSON

你需要为用户的书签生成分类名称列表。`,
    classify: `请分析以下书签并生成不超过{maxCategories}个分类名称。

书签列表：
{bookmarks}

要求：
1. 分类数量不超过{maxCategories}个
2. 每个分类名称2-6个中文字符
3. 分类应覆盖所有书签类型
4. 分类名称要通用、易懂

请返回JSON数组格式：
["分类1", "分类2", "分类3", ...]`
};

let currentProvider = 'deepseek';
let config = {};

document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    initNavigation();
    initProviderCards();
    initEventListeners();
    await loadBookmarks();
});

async function loadConfig() {
    try {
        const result = await chrome.storage.local.get(['aimark_config']);
        config = result.aimark_config || getDefaultConfig();
        
        document.getElementById('apiKey').value = config.ai?.apiKey || '';
        document.getElementById('endpoint').value = config.ai?.endpoint || '';
        document.getElementById('model').value = config.ai?.model || '';
        document.getElementById('temperature').value = config.ai?.temperature || 0.3;
        document.getElementById('autoClassify').checked = config.classification?.autoClassify || false;
        document.getElementById('maxFolders').value = config.classification?.maxFolders || 10;
        document.getElementById('maxDepth').value = config.classification?.maxDepth || 2;
        document.getElementById('systemPrompt').value = config.prompts?.system || '';
        document.getElementById('classifyPrompt').value = config.prompts?.classify || '';
        
        currentProvider = config.ai?.provider || 'deepseek';
        updateProviderSelection();
    } catch (error) {
        console.error('加载配置失败:', error);
    }
}

function getDefaultConfig() {
    return {
        ai: {
            provider: 'deepseek',
            apiKey: '',
            endpoint: PROVIDERS.deepseek.endpoint,
            model: PROVIDERS.deepseek.model,
            temperature: 0.3,
            maxTokens: 4000
        },
        classification: {
            autoClassify: false,
            maxFolders: 10,
            maxDepth: 2
        },
        prompts: {
            system: '',
            classify: ''
        },
        general: {
            showNotifications: true
        }
    };
}

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const pageTitle = document.getElementById('pageTitle');
    
    const titles = {
        bookmarks: '书签管理',
        settings: '设置',
        backup: '备份管理',
        about: '关于'
    };
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            pages.forEach(p => p.classList.remove('active'));
            document.getElementById(page + 'Page').classList.add('active');
            
            pageTitle.textContent = titles[page];
            
            if (page === 'backup') {
                loadBackups();
            }
        });
    });
}

function initProviderCards() {
    const cards = document.querySelectorAll('.provider-card');
    
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const provider = card.dataset.provider;
            currentProvider = provider;
            updateProviderSelection();
            
            if (provider !== 'custom') {
                document.getElementById('endpoint').value = PROVIDERS[provider].endpoint;
                document.getElementById('model').value = PROVIDERS[provider].model;
            }
        });
    });
}

function updateProviderSelection() {
    const cards = document.querySelectorAll('.provider-card');
    cards.forEach(card => {
        if (card.dataset.provider === currentProvider) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

function initEventListeners() {
    document.getElementById('testConnection').addEventListener('click', testConnection);
    document.getElementById('saveAIConfig').addEventListener('click', saveAIConfig);
    document.getElementById('saveClassificationConfig').addEventListener('click', saveClassificationConfig);
    document.getElementById('savePromptConfig').addEventListener('click', savePromptConfig);
    document.getElementById('resetPromptConfig').addEventListener('click', resetPromptConfig);
    document.getElementById('organizeBtn').addEventListener('click', startOrganize);
    document.getElementById('backupNow').addEventListener('click', backupNow);
    document.getElementById('restoreBackup').addEventListener('click', restoreBackup);
    document.getElementById('deleteBackup').addEventListener('click', deleteBackup);
    
    initTreeToolbar();
}

function initTreeToolbar() {
    const searchInput = document.getElementById('treeSearch');
    const clearSearch = document.getElementById('clearSearch');
    const expandAll = document.getElementById('expandAll');
    const collapseAll = document.getElementById('collapseAll');
    const refreshTree = document.getElementById('refreshTree');
    
    let searchTimeout = null;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearSearch.style.display = query ? 'block' : 'none';
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (bookmarkTree) {
                if (query) {
                    bookmarkTree.search(query);
                } else {
                    bookmarkTree.clearSearch();
                }
            }
        }, 300);
    });
    
    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        clearSearch.style.display = 'none';
        if (bookmarkTree) {
            bookmarkTree.clearSearch();
        }
    });
    
    expandAll.addEventListener('click', () => {
        if (bookmarkTree) {
            bookmarkTree.expandAll();
        }
    });
    
    collapseAll.addEventListener('click', () => {
        if (bookmarkTree) {
            bookmarkTree.collapseAll();
        }
    });
    
    refreshTree.addEventListener('click', async () => {
        if (bookmarkTree) {
            await bookmarkTree.refresh();
            showToast('书签已刷新', 'success');
        }
    });
}

let bookmarkTree = null;

async function loadBookmarks() {
    try {
        bookmarkTree = new BookmarkTree('#bookmarkTree', {
            lazyLoad: true,
            showIcons: true,
            onNodeClick: (data) => {
                console.log('点击节点:', data);
            },
            onNodeDoubleClick: (data) => {
                if (data.type === 'bookmark' && data.node.url) {
                    chrome.tabs.create({ url: data.node.url });
                }
            },
            onNodeContextMenu: (data) => {
                showContextMenu(data);
            }
        });
        
        await bookmarkTree.loadBookmarksBar();
    } catch (error) {
        console.error('加载书签失败:', error);
        document.getElementById('bookmarkTree').innerHTML = '<p style="color: #c62828;">加载失败</p>';
    }
}

function showContextMenu(data) {
    const existing = document.querySelector('.tree-context-menu');
    if (existing) existing.remove();
    
    const menu = document.createElement('div');
    menu.className = 'tree-context-menu';
    menu.style.left = data.event.clientX + 'px';
    menu.style.top = data.event.clientY + 'px';
    
    if (data.type === 'bookmark') {
        menu.innerHTML = `
            <div class="tree-context-menu-item" data-action="open">打开链接</div>
            <div class="tree-context-menu-item" data-action="copy">复制链接</div>
        `;
    } else {
        menu.innerHTML = `
            <div class="tree-context-menu-item" data-action="refresh">刷新文件夹</div>
        `;
    }
    
    document.body.appendChild(menu);
    
    const closeMenu = () => {
        menu.remove();
        document.removeEventListener('click', closeMenu);
    };
    
    menu.addEventListener('click', async (e) => {
        const action = e.target.dataset.action;
        if (!action) return;
        
        if (action === 'open' && data.node.url) {
            chrome.tabs.create({ url: data.node.url });
        } else if (action === 'copy' && data.node.url) {
            await navigator.clipboard.writeText(data.node.url);
            showToast('链接已复制', 'success');
        } else if (action === 'refresh') {
            if (bookmarkTree) {
                await bookmarkTree.refreshNode(data.node.id);
            }
        }
        
        closeMenu();
    });
    
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 10);
}

async function testConnection() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const endpoint = document.getElementById('endpoint').value.trim();
    const model = document.getElementById('model').value.trim();
    
    if (!apiKey || !endpoint || !model) {
        showToast('请填写完整的API配置', 'error');
        return;
    }
    
    showToast('正在测试连接...', 'success');
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 10
            })
        });
        
        if (response.ok) {
            showToast('连接成功！', 'success');
        } else {
            const error = await response.json().catch(() => ({}));
            showToast(`连接失败: ${error.error?.message || response.status}`, 'error');
        }
    } catch (error) {
        showToast(`连接失败: ${error.message}`, 'error');
    }
}

async function saveAIConfig() {
    config.ai = {
        ...config.ai,
        provider: currentProvider,
        apiKey: document.getElementById('apiKey').value.trim(),
        endpoint: document.getElementById('endpoint').value.trim(),
        model: document.getElementById('model').value.trim(),
        temperature: parseFloat(document.getElementById('temperature').value) || 0.3
    };
    
    await chrome.storage.local.set({ aimark_config: config });
    showToast('AI配置已保存', 'success');
}

async function saveClassificationConfig() {
    config.classification = {
        autoClassify: document.getElementById('autoClassify').checked,
        maxFolders: parseInt(document.getElementById('maxFolders').value) || 10,
        maxDepth: parseInt(document.getElementById('maxDepth').value) || 2
    };
    
    await chrome.storage.local.set({ aimark_config: config });
    showToast('分类配置已保存', 'success');
}

async function savePromptConfig() {
    config.prompts = {
        system: document.getElementById('systemPrompt').value.trim(),
        classify: document.getElementById('classifyPrompt').value.trim()
    };
    
    await chrome.storage.local.set({ aimark_config: config });
    showToast('提示词配置已保存', 'success');
}

async function resetPromptConfig() {
    document.getElementById('systemPrompt').value = '';
    document.getElementById('classifyPrompt').value = '';
    
    config.prompts = {
        system: '',
        classify: ''
    };
    
    await chrome.storage.local.set({ aimark_config: config });
    showToast('提示词已重置为默认', 'success');
}

let classificationFlow = null;

async function startOrganize() {
    const btn = document.getElementById('organizeBtn');
    btn.disabled = true;
    
    try {
        const tree = await chrome.bookmarks.getTree();
        const root = tree[0];
        
        const bookmarkBar = root.children.find(
            node => node.id === '1' || 
                    node.title === '书签栏' || 
                    node.title === 'Bookmarks bar'
        );
        
        if (!bookmarkBar) {
            showToast('未找到书签栏', 'error');
            return;
        }
        
        const bookmarks = await getAllBookmarks(bookmarkBar);
        
        if (bookmarks.length === 0) {
            showToast('书签栏中没有书签', 'error');
            return;
        }
        
        const container = document.getElementById('bookmarkTreeContainer');
        
        classificationFlow = new ClassificationFlow(container, {
            onComplete: async () => {
                btn.disabled = false;
                await loadBookmarks();
                showToast('书签整理完成', 'success');
            },
            onCancel: () => {
                btn.disabled = false;
                loadBookmarks();
            }
        });
        
        await classificationFlow.start(bookmarks);
        
    } catch (error) {
        console.error('启动整理失败:', error);
        showToast('启动失败: ' + error.message, 'error');
        btn.disabled = false;
    }
}

async function getAllBookmarks(folder) {
    const bookmarks = [];
    
    async function traverse(node) {
        if (node.url) {
            bookmarks.push(node);
        } else if (node.children) {
            for (const child of node.children) {
                await traverse(child);
            }
        }
    }
    
    await traverse(folder);
    return bookmarks;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type;
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => toast.classList.remove('show'), 3000);
}

let selectedBackup = null;

async function loadBackups() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getBackups' });
        
        if (!response.success) {
            throw new Error(response.error);
        }
        
        const backupList = document.getElementById('backupList');
        const backups = response.backups || [];
        
        if (backups.length === 0) {
            backupList.innerHTML = '<p style="color: #888; font-size: 13px; padding: 12px 0;">暂无备份，点击"立即备份"创建您的第一个备份。</p>';
            document.getElementById('restoreBackup').disabled = true;
            document.getElementById('deleteBackup').disabled = true;
            return;
        }
        
        backupList.innerHTML = backups.map(backup => `
            <label class="backup-item">
                <input type="radio" name="backup" value="${backup.timestamp}" />
                <span class="backup-info">
                    <span class="backup-date">${formatDate(backup.date)}</span>
                    <span class="backup-time">${formatTime(backup.date)}</span>
                    <span class="backup-count">${getBookmarkCount(backup)} 个书签</span>
                </span>
            </label>
        `).join('');
        
        selectedBackup = null;
        document.getElementById('restoreBackup').disabled = true;
        document.getElementById('deleteBackup').disabled = true;
        
        document.querySelectorAll('input[name="backup"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                selectedBackup = parseInt(e.target.value);
                document.getElementById('restoreBackup').disabled = false;
                document.getElementById('deleteBackup').disabled = false;
            });
        });
        
    } catch (error) {
        console.error('加载备份列表失败:', error);
    }
}

function getBookmarkCount(backup) {
    try {
        const root = backup.bookmarks[0];
        const bookmarkBar = root.children.find(
            node => node.id === '1' || node.title === '书签栏' || node.title === 'Bookmarks bar'
        );
        
        if (!bookmarkBar) return 0;
        
        let count = 0;
        function countBookmarks(node) {
            if (node.url) {
                count++;
            } else if (node.children) {
                node.children.forEach(countBookmarks);
            }
        }
        bookmarkBar.children.forEach(countBookmarks);
        return count;
    } catch {
        return 0;
    }
}

async function backupNow() {
    const statusEl = document.getElementById('backupStatus');
    statusEl.textContent = '正在备份...';
    
    try {
        const response = await chrome.runtime.sendMessage({ action: 'backupBookmarks' });
        
        if (!response.success) {
            throw new Error(response.error);
        }
        
        statusEl.textContent = '备份成功！';
        statusEl.style.color = '#2e7d32';
        
        await loadBackups();
        
        setTimeout(() => {
            statusEl.textContent = '';
        }, 3000);
        
    } catch (error) {
        statusEl.textContent = '备份失败: ' + error.message;
        statusEl.style.color = '#c62828';
    }
}

async function restoreBackup() {
    if (!selectedBackup) {
        showToast('请选择要恢复的备份', 'error');
        return;
    }
    
    if (!confirm('确定要恢复备份吗？这将覆盖当前的书签结构！')) {
        return;
    }
    
    try {
        showToast('正在恢复...', 'success');
        
        const response = await chrome.runtime.sendMessage({
            action: 'restoreBackup',
            timestamp: selectedBackup
        });
        
        if (!response.success) {
            throw new Error(response.error);
        }
        
        showToast('恢复成功！', 'success');
        
        if (bookmarkTree) {
            await bookmarkTree.refresh();
        }
        
    } catch (error) {
        showToast('恢复失败: ' + error.message, 'error');
    }
}

async function deleteBackup() {
    if (!selectedBackup) {
        showToast('请选择要删除的备份', 'error');
        return;
    }
    
    if (!confirm('确定要删除选中的备份吗？此操作不可撤销！')) {
        return;
    }
    
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'deleteBackup',
            timestamp: selectedBackup
        });
        
        if (!response.success) {
            throw new Error(response.error);
        }
        
        showToast('备份已删除', 'success');
        await loadBackups();
        
    } catch (error) {
        showToast('删除失败: ' + error.message, 'error');
    }
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('zh-CN');
}

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
