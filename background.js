importScripts('modules/configManager.js');
importScripts('modules/promptManager.js');
importScripts('modules/bookmarkMonitor.js');
importScripts('modules/aiClassifier.js');
importScripts('modules/bookmarkCache.js');

const BatchClassifier = {
    isRunning: false,
    
    async start() {
        if (this.isRunning) {
            console.log('[BatchClassifier] 已有分类任务在运行');
            return;
        }
        
        this.isRunning = true;
        
        try {
            const aiConfig = await ConfigManager.getAIConfig();
            if (!aiConfig.apiKey) {
                throw new Error('请先配置API密钥');
            }
            
            const bookmarkBarId = await BookmarkMonitor.getBookmarkBarId();
            const bookmarks = BookmarkMonitor.getBookmarksInFolder(bookmarkBarId);
            
            if (bookmarks.length === 0) {
                throw new Error('书签栏中没有书签');
            }
            
            console.log(`[BatchClassifier] 开始分类 ${bookmarks.length} 个书签`);
            
            this.sendProgress({ stage: 'init', status: '正在初始化...', progress: 5 });
            
            const result = await AIClassifier.batchClassifyWithTree(bookmarks, (progress) => {
                this.sendProgress(progress);
            });
            
            if (result.validation && !result.validation.valid) {
                console.warn('[BatchClassifier] 分类结果存在校验问题:', result.validation);
            }
            
            await this.applyTreeClassification(result, bookmarkBarId);
            
            this.sendProgress({ stage: 'complete', status: '分类完成！', progress: 100 });
            
            const config = await ConfigManager.getAll();
            if (config.general?.showNotifications) {
                const folderCount = Object.keys(result.classification).length;
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: '书签分类完成',
                    message: `成功分类 ${bookmarks.length} 个书签到 ${folderCount} 个分类`
                });
            }
            
            return result;
        } catch (error) {
            console.error('[BatchClassifier] 分类失败:', error);
            this.sendProgress({ stage: 'error', status: error.message, progress: 0 });
            throw error;
        } finally {
            this.isRunning = false;
        }
    },
    
    async applyTreeClassification(result, parentId) {
        const { classification, categoryTree } = result;
        
        const folderMap = {};
        await this.createFolderStructure(categoryTree, parentId, '', folderMap);
        
        if (classification['未分类'] && classification['未分类'].length > 0) {
            const unclassifiedFolder = await this.findOrCreateFolder('未分类', parentId);
            folderMap['未分类'] = unclassifiedFolder.id;
        }
        
        for (const [path, bookmarks] of Object.entries(classification)) {
            const folderId = folderMap[path];
            if (!folderId || bookmarks.length === 0) continue;
            
            for (const bookmark of bookmarks) {
                try {
                    await chrome.bookmarks.move(bookmark.id, { parentId: folderId });
                    const reason = bookmark.reason ? ` (${bookmark.reason})` : '';
                    console.log(`[BatchClassifier] 移动书签: ${bookmark.title} -> ${path}${reason}`);
                } catch (error) {
                    console.error(`[BatchClassifier] 移动书签失败: ${bookmark.id}`, error);
                }
            }
        }
    },
    
    async createFolderStructure(categories, parentId, parentPath, folderMap) {
        for (const category of categories) {
            const currentPath = parentPath ? `${parentPath}/${category.name}` : category.name;
            
            const folder = await this.findOrCreateFolder(category.name, parentId);
            folderMap[currentPath] = folder.id;
            
            if (category.children && category.children.length > 0) {
                await this.createFolderStructure(category.children, folder.id, currentPath, folderMap);
            }
        }
    },
    
    async findOrCreateFolder(name, parentId) {
        const children = await chrome.bookmarks.getChildren(parentId);
        const existing = children.find(child => !child.url && child.title === name);
        
        if (existing) {
            return existing;
        }
        
        return await chrome.bookmarks.create({
            parentId: parentId,
            title: name
        });
    },
    
    sendProgress(progress) {
        chrome.runtime.sendMessage({
            type: 'classifyProgress',
            ...progress
        }).catch(() => {});
    }
};

const RealtimeClassifier = {
    pendingBookmarks: new Map(),
    delay: 5000,
    
    init() {
        BookmarkMonitor.addListener(async (event, data) => {
            if (event === 'created' && data.bookmark?.url) {
                await this.handleNewBookmark(data.bookmark);
            }
        });
        console.log('[RealtimeClassifier] 初始化完成');
    },
    
    async handleNewBookmark(bookmark) {
        const config = await ConfigManager.getClassificationConfig();
        if (!config.autoClassify) {
            return;
        }
        
        const otherId = await BookmarkMonitor.getOtherBookmarksId();
        if (bookmark.parentId !== otherId) {
            return;
        }
        
        console.log(`[RealtimeClassifier] 检测到新书签: ${bookmark.title}`);
        
        if (this.pendingBookmarks.has(bookmark.id)) {
            clearTimeout(this.pendingBookmarks.get(bookmark.id));
        }
        
        const timeoutId = setTimeout(async () => {
            this.pendingBookmarks.delete(bookmark.id);
            await this.classifyBookmark(bookmark);
        }, this.delay);
        
        this.pendingBookmarks.set(bookmark.id, timeoutId);
    },
    
    async classifyBookmark(bookmark) {
        try {
            const aiConfig = await ConfigManager.getAIConfig();
            if (!aiConfig.apiKey) {
                console.log('[RealtimeClassifier] API未配置，跳过分类');
                return;
            }
            
            const folders = BookmarkMonitor.getAllFolders();
            const result = await AIClassifier.classifySingle(bookmark, Object.values(folders), aiConfig);
            
            const bookmarkBarId = await BookmarkMonitor.getBookmarkBarId();
            const folder = await BatchClassifier.findOrCreateFolder(result.category, bookmarkBarId);
            
            await chrome.bookmarks.move(bookmark.id, { parentId: folder.id });
            
            console.log(`[RealtimeClassifier] 分类完成: ${bookmark.title} -> ${result.category}`);
            
            const config = await ConfigManager.getAll();
            if (config.general?.showNotifications) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: '书签已自动分类',
                    message: `"${bookmark.title}" 已分类到 "${result.category}"`
                });
            }
        } catch (error) {
            console.error('[RealtimeClassifier] 分类失败:', error);
        }
    }
};

chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('[Background] 扩展已安装');
    await ConfigManager.init();
    await PromptManager.init();
    await BookmarkMonitor.init();
    await BookmarkCache.init();
    RealtimeClassifier.init();
    
    if (details.reason === 'install') {
        chrome.tabs.create({ url: 'manager.html' });
    }
});

chrome.runtime.onStartup.addListener(async () => {
    console.log('[Background] 浏览器启动');
    await ConfigManager.init();
    await PromptManager.init();
    await BookmarkMonitor.init();
    await BookmarkCache.init();
    RealtimeClassifier.init();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startBatchClassify') {
        BatchClassifier.start()
            .then(result => sendResponse({ success: true, result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (message.action === 'generateFolders') {
        generateFolders(message.bookmarks)
            .then(folders => sendResponse({ success: true, folders }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (message.action === 'generateCategoryTree') {
        generateCategoryTree(message.bookmarks)
            .then(result => sendResponse({ success: true, ...result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (message.action === 'classifyBookmarksByTree') {
        classifyBookmarksByTree(message.bookmarks, message.categoryTree)
            .then(classification => sendResponse({ success: true, classification }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (message.action === 'classifyBookmarks') {
        classifyBookmarks(message.bookmarks, message.folders)
            .then(classification => sendResponse({ success: true, classification }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (message.action === 'backupBookmarks') {
        backupBookmarks()
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (message.action === 'applyClassification') {
        applyClassification(message.folders, message.classification)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (message.action === 'getBackups') {
        getBackups()
            .then(backups => sendResponse({ success: true, backups }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (message.action === 'restoreBackup') {
        restoreBackup(message.timestamp)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (message.action === 'deleteBackup') {
        deleteBackup(message.timestamp)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (message.action === 'getBookmarkCache') {
        const bookmarks = BookmarkCache.getAll();
        sendResponse({ success: true, bookmarks });
        return true;
    }
    
    if (message.action === 'getBookmarkById') {
        const bookmark = BookmarkCache.get(message.id);
        sendResponse({ success: true, bookmark });
        return true;
    }
    
    if (message.action === 'searchBookmarks') {
        const results = BookmarkCache.search(message.query);
        sendResponse({ success: true, results });
        return true;
    }
    
    if (message.action === 'refreshBookmarkCache') {
        BookmarkCache.refresh()
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (message.action === 'getBookmarkCacheStats') {
        const stats = BookmarkCache.getStats();
        sendResponse({ success: true, stats });
        return true;
    }
    
    if (message.action === 'getConfig') {
        ConfigManager.getAll().then(config => sendResponse(config));
        return true;
    }
    
    if (message.action === 'setConfig') {
        ConfigManager.setAll(message.config).then(() => sendResponse({ success: true }));
        return true;
    }
});

async function generateFolders(bookmarks) {
    const aiConfig = await ConfigManager.getAIConfig();
    
    if (!aiConfig || !aiConfig.apiKey) {
        throw new Error('请先在设置页面配置API密钥');
    }
    
    await PromptManager.init();
    const systemPrompt = PromptManager.get('system');
    const classifyConfig = await ConfigManager.getClassificationConfig();
    
    const maxCategories = classifyConfig.maxFolders || 10;
    
    const bookmarkList = bookmarks.map((b, i) => 
        `${i + 1}. ${b.title} - ${b.url}`
    ).join('\n');
    
    const messages = [
        { role: 'system', content: systemPrompt || '你是一个专业的书签分类助手。' },
        { role: 'user', content: `请分析以下书签，生成不超过${maxCategories}个分类文件夹名称。

书签列表：
${bookmarkList}

要求：
1. 分类名称简洁，2-6个中文字符
2. 分类应覆盖所有书签类型
3. 分类名称要通用、易懂

请只返回JSON数组格式，不要其他内容：
["分类1", "分类2", "分类3", ...]` }
    ];
    
    const content = await AIClassifier.chat(messages, aiConfig);
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        throw new Error('AI返回格式错误: ' + content.substring(0, 100));
    }
    
    const folders = JSON.parse(jsonMatch[0]);
    return folders.filter(f => f && f.trim()).slice(0, maxCategories);
}

async function generateCategoryTree(bookmarks) {
    const aiConfig = await ConfigManager.getAIConfig();
    
    if (!aiConfig || !aiConfig.apiKey) {
        throw new Error('请先在设置页面配置API密钥');
    }
    
    await PromptManager.init();
    const classifyConfig = await ConfigManager.getClassificationConfig();
    const maxDepth = classifyConfig.maxDepth || 2;
    const maxCategories = classifyConfig.maxFolders || 10;
    
    const result = await AIClassifier.generateCategoryTree(
        bookmarks, 
        maxDepth, 
        maxCategories, 
        aiConfig, 
        PromptManager.get('system')
    );
    
    return {
        categoryTree: result.categories,
        userProfile: result.userProfile
    };
}

async function classifyBookmarksByTree(bookmarks, categoryTree) {
    const aiConfig = await ConfigManager.getAIConfig();
    await PromptManager.init();
    const classifyConfig = await ConfigManager.getClassificationConfig();
    const systemPrompt = PromptManager.get('system');
    const batchSize = classifyConfig.batchSize || 30;
    
    const treeWithUnclassified = [
        ...categoryTree,
        { name: '未分类', children: [] }
    ];
    
    const allAssignments = [];
    const batches = Math.ceil(bookmarks.length / batchSize);
    
    for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, bookmarks.length);
        const batch = bookmarks.slice(start, end);
        
        console.log(`[Background] 分类批次 ${i + 1}/${batches}, 书签范围 ${start + 1}-${end}`);
        
        const result = await AIClassifier.classifyBookmarksByTree(
            batch, 
            treeWithUnclassified, 
            aiConfig
        );
        
        const assignments = result.assignments || [];
        assignments.forEach(a => {
            a.index = a.index + start;
        });
        
        allAssignments.push(...assignments);
    }
    
    const classification = AIClassifier.buildClassificationResult(bookmarks, allAssignments, categoryTree);
    
    const totalClassified = Object.values(classification).flat().length;
    console.log('[Background] 总共分类了', totalClassified, '个书签');
    
    return classification;
}

async function classifyBookmarks(bookmarks, folders) {
    const aiConfig = await ConfigManager.getAIConfig();
    await PromptManager.init();
    const systemPrompt = PromptManager.get('system');
    
    const BATCH_SIZE = 30;
    const classification = {};
    folders.forEach(folder => { classification[folder] = []; });
    
    if (bookmarks.length <= BATCH_SIZE) {
        const result = await classifySingleBatch(bookmarks, folders, aiConfig, systemPrompt, 0);
        mergeClassificationResult(classification, result, folders, bookmarks);
    } else {
        const batches = Math.ceil(bookmarks.length / BATCH_SIZE);
        for (let i = 0; i < batches; i++) {
            const start = i * BATCH_SIZE;
            const end = Math.min(start + BATCH_SIZE, bookmarks.length);
            const batch = bookmarks.slice(start, end);
            
            console.log(`[Background] 处理批次 ${i + 1}/${batches}, 书签范围 ${start + 1}-${end}`);
            
            const result = await classifySingleBatch(batch, folders, aiConfig, systemPrompt, start);
            mergeClassificationResult(classification, result, folders, bookmarks);
        }
    }
    
    const totalClassified = Object.values(classification).flat().length;
    console.log('[Background] 总共分类了', totalClassified, '个书签');
    
    return classification;
}

async function classifySingleBatch(batchBookmarks, folders, aiConfig, systemPrompt, globalOffset) {
    const bookmarkList = batchBookmarks.map((b, i) => 
        `${i + 1}. ${b.title} - ${b.url}`
    ).join('\n');
    
    const folderList = folders.map((f, i) => `${i + 1}. ${f}`).join('\n');
    
    const messages = [
        { role: 'system', content: systemPrompt || '你是一个专业的书签分类助手。' },
        { role: 'user', content: `请将以下书签分配到对应的文件夹中。

文件夹列表：
${folderList}

书签列表：
${bookmarkList}

请返回JSON对象格式，key为文件夹名称，value为该书签在书签列表中的序号数组（使用上面列表中的序号，从1开始）：
{
  "文件夹1": [1, 5, 8],
  "文件夹2": [2, 3, 7],
  ...}` }
    ];
    
    const content = await AIClassifier.chat(messages, aiConfig);
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('AI返回格式错误: ' + content.substring(0, 100));
    }
    
    return JSON.parse(jsonMatch[0]);
}

function mergeClassificationResult(classification, result, folders, allBookmarks) {
    console.log('[Background] AI分类批次结果:', result);
    
    for (const [folder, indices] of Object.entries(result)) {
        let matchedFolder = folders.find(f => f === folder);
        
        if (!matchedFolder) {
            matchedFolder = folders.find(f => 
                f.includes(folder) || folder.includes(f) ||
                f.replace(/\s/g, '') === folder.replace(/\s/g, '')
            );
        }
        
        if (!matchedFolder) {
            const folderClean = folder.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
            matchedFolder = folders.find(f => {
                const fClean = f.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
                return fClean === folderClean || fClean.includes(folderClean) || folderClean.includes(fClean);
            });
        }
        
        console.log('[Background] 匹配文件夹:', folder, '->', matchedFolder, '序号:', indices);
        
        if (matchedFolder && Array.isArray(indices)) {
            const bookmarkItems = indices.map(i => {
                const idx = typeof i === 'number' ? i - 1 : parseInt(i) - 1;
                return allBookmarks[idx];
            }).filter(Boolean);
            
            classification[matchedFolder].push(...bookmarkItems);
            console.log('[Background] 文件夹', matchedFolder, '分配了', bookmarkItems.length, '个书签');
        }
    }
}

async function backupBookmarks() {
    const tree = await chrome.bookmarks.getTree();
    const backup = {
        timestamp: Date.now(),
        date: new Date().toISOString(),
        bookmarks: tree
    };
    
    const result = await chrome.storage.local.get(['aimark_backups']);
    const backups = result.aimark_backups || [];
    
    backups.unshift(backup);
    
    if (backups.length > 5) {
        backups.pop();
    }
    
    await chrome.storage.local.set({ aimark_backups: backups });
    console.log('[Background] 书签已备份');
}

async function getBackups() {
    const result = await chrome.storage.local.get(['aimark_backups']);
    return result.aimark_backups || [];
}

async function restoreBackup(timestamp) {
    const result = await chrome.storage.local.get(['aimark_backups']);
    const backups = result.aimark_backups || [];
    
    const backup = backups.find(b => b.timestamp === timestamp);
    if (!backup) {
        throw new Error('未找到备份');
    }
    
    const tree = await chrome.bookmarks.getTree();
    const root = tree[0];
    
    const bookmarkBar = root.children.find(
        node => node.id === '1' || 
                node.title === '书签栏' || 
                node.title === 'Bookmarks bar'
    );
    
    if (!bookmarkBar) {
        throw new Error('未找到书签栏');
    }
    
    const backupRoot = backup.bookmarks[0];
    const backupBookmarkBar = backupRoot.children.find(
        node => node.id === '1' || 
                node.title === '书签栏' || 
                node.title === 'Bookmarks bar'
    );
    
    if (!backupBookmarkBar) {
        throw new Error('备份中没有书签栏');
    }
    
    for (const child of bookmarkBar.children) {
        if (child.url || child.title) {
            try {
                await chrome.bookmarks.removeTree(child.id);
            } catch (e) {
                console.warn('[Background] 删除失败:', child.title, e);
            }
        }
    }
    
    async function restoreNode(node, parentId) {
        if (node.url) {
            await chrome.bookmarks.create({
                parentId: parentId,
                title: node.title,
                url: node.url
            });
        } else if (node.children) {
            const folder = await chrome.bookmarks.create({
                parentId: parentId,
                title: node.title
            });
            
            for (const child of node.children) {
                await restoreNode(child, folder.id);
            }
        }
    }
    
    for (const child of backupBookmarkBar.children) {
        await restoreNode(child, bookmarkBar.id);
    }
    
    console.log('[Background] 书签已恢复');
}

async function deleteBackup(timestamp) {
    const result = await chrome.storage.local.get(['aimark_backups']);
    const backups = result.aimark_backups || [];
    
    const index = backups.findIndex(b => b.timestamp === timestamp);
    if (index === -1) {
        throw new Error('未找到备份');
    }
    
    backups.splice(index, 1);
    
    await chrome.storage.local.set({ aimark_backups: backups });
    console.log('[Background] 备份已删除');
}

async function applyClassification(folders, classification) {
    const tree = await chrome.bookmarks.getTree();
    const root = tree[0];
    
    const bookmarkBar = root.children.find(
        node => node.id === '1' || 
                node.title === '书签栏' || 
                node.title === 'Bookmarks bar'
    );
    
    if (!bookmarkBar) {
        throw new Error('未找到书签栏');
    }
    
    const otherBookmarks = root.children.find(
        node => node.id === '2' || 
                node.title === '其他书签' || 
                node.title === 'Other bookmarks'
    );
    
    const oldFolderIds = bookmarkBar.children
        .filter(child => !child.url && child.title)
        .map(child => child.id);
    
    const folderMap = {};
    
    for (const folderPath of folders) {
        const pathParts = folderPath.split('/').filter(p => p);
        let currentParentId = bookmarkBar.id;
        let currentPath = '';
        
        for (let i = 0; i < pathParts.length; i++) {
            const folderName = pathParts[i];
            currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
            
            const children = await chrome.bookmarks.getChildren(currentParentId);
            const existing = children.find(child => !child.url && child.title === folderName);
            
            if (existing) {
                folderMap[currentPath] = existing.id;
                currentParentId = existing.id;
            } else {
                const newFolder = await chrome.bookmarks.create({
                    parentId: currentParentId,
                    title: folderName
                });
                folderMap[currentPath] = newFolder.id;
                currentParentId = newFolder.id;
            }
        }
    }
    
    const classifiedIds = new Set();
    for (const bookmarks of Object.values(classification)) {
        if (Array.isArray(bookmarks)) {
            bookmarks.forEach(b => {
                if (b && b.id) classifiedIds.add(b.id);
            });
        }
    }
    
    for (const [folderName, bookmarks] of Object.entries(classification)) {
        const folderId = folderMap[folderName];
        if (!folderId || !Array.isArray(bookmarks)) continue;
        
        for (const bookmark of bookmarks) {
            if (bookmark && bookmark.id) {
                try {
                    await chrome.bookmarks.move(bookmark.id, {
                        parentId: folderId
                    });
                } catch (e) {
                    console.warn('[Background] 移动书签失败:', bookmark.title, e);
                }
            }
        }
    }
    
    if (otherBookmarks) {
        const unclassifiedBookmarks = bookmarkBar.children.filter(
            child => child.url && !classifiedIds.has(child.id)
        );
        
        for (const bookmark of unclassifiedBookmarks) {
            try {
                await chrome.bookmarks.move(bookmark.id, {
                    parentId: otherBookmarks.id
                });
                console.log('[Background] 未分类书签移动到其他书签:', bookmark.title);
            } catch (e) {
                console.warn('[Background] 移动未分类书签失败:', bookmark.title, e);
            }
        }
    }
    
    const newFolderIds = Object.values(folderMap);
    
    for (const folderId of oldFolderIds) {
        if (newFolderIds.includes(folderId)) continue;
        
        try {
            await chrome.bookmarks.removeTree(folderId);
            console.log('[Background] 删除旧文件夹:', folderId);
        } catch (e) {
            console.warn('[Background] 删除文件夹失败:', folderId, e);
        }
    }
    
    console.log('[Background] 分类已应用');
}

console.log('[Background] Service Worker 已加载');
