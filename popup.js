document.addEventListener('DOMContentLoaded', async () => {
    const elements = {
        totalBookmarks: document.getElementById('totalBookmarks'),
        unclassified: document.getElementById('unclassified'),
        realtimeClassify: document.getElementById('realtimeClassify'),
        showNotifications: document.getElementById('showNotifications'),
        openManager: document.getElementById('openManager'),
        aiStatus: document.getElementById('aiStatus')
    };

    await loadStats();
    await loadSettings();
    setupEventListeners();

    async function loadStats() {
        try {
            const tree = await chrome.bookmarks.getTree();
            let total = 0;
            let unclassified = 0;
            
            const countBookmarks = (nodes) => {
                for (const node of nodes) {
                    if (node.url) {
                        total++;
                        if (node.parentId === '2' || node.parentId === 'unfiled_____') {
                            unclassified++;
                        }
                    }
                    if (node.children) {
                        countBookmarks(node.children);
                    }
                }
            };
            
            countBookmarks(tree);
            elements.totalBookmarks.textContent = total;
            elements.unclassified.textContent = unclassified;
        } catch (error) {
            console.error('加载统计失败:', error);
        }
    }

    async function loadSettings() {
        try {
            const result = await chrome.storage.local.get(['aimark_config']);
            const config = result.aimark_config || {};
            
            elements.realtimeClassify.checked = config.classification?.autoClassify ?? false;
            elements.showNotifications.checked = config.general?.showNotifications ?? true;
            
            if (config.ai?.apiKey) {
                elements.aiStatus.textContent = '已配置';
                elements.aiStatus.style.color = '#2e7d32';
            } else {
                elements.aiStatus.textContent = '未配置';
                elements.aiStatus.style.color = '#c62828';
            }
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    function setupEventListeners() {
        elements.realtimeClassify.addEventListener('change', async (e) => {
            await saveSetting('classification.autoClassify', e.target.checked);
        });

        elements.showNotifications.addEventListener('change', async (e) => {
            await saveSetting('general.showNotifications', e.target.checked);
        });

        elements.openManager.addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('manager.html') });
        });
    }

    async function saveSetting(path, value) {
        try {
            const result = await chrome.storage.local.get(['aimark_config']);
            const config = result.aimark_config || {};
            const keys = path.split('.');
            let obj = config;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (!obj[keys[i]]) obj[keys[i]] = {};
                obj = obj[keys[i]];
            }
            
            obj[keys[keys.length - 1]] = value;
            await chrome.storage.local.set({ aimark_config: config });
        } catch (error) {
            console.error('保存设置失败:', error);
        }
    }
});
