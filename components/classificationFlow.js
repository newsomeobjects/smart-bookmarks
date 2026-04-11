class ClassificationFlow {
    constructor(container, options = {}) {
        this.container = typeof container === 'string'
            ? document.querySelector(container)
            : container;
        
        this.options = {
            onComplete: options.onComplete || (() => {}),
            onCancel: options.onCancel || (() => {}),
            ...options
        };
        
        this.state = {
            step: 0,
            categoryTree: [],
            userProfile: null,
            bookmarks: [],
            classification: null,
            backup: null
        };
        
        this.originalContent = null;
        this.setupErrorHandling();
    }
    
    setupErrorHandling() {
        this.container.addEventListener('error', (e) => {
            if (e.target.classList.contains('bookmark-favicon')) {
                e.target.style.display = 'none';
            }
        }, true);
    }
    
    async start(bookmarks) {
        this.state.bookmarks = bookmarks;
        this.state.step = 1;
        this.originalContent = this.container.innerHTML;
        this.originalOverflow = this.container.style.overflow || '';
        this.container.style.overflow = 'hidden';
        
        this.showLoadingStep();
        
        try {
            const result = await this.generateCategoryTree(bookmarks);
            this.state.categoryTree = result.categoryTree;
            this.state.userProfile = result.userProfile;
            this.state.step = 2;
            this.showCategoryEditStep();
        } catch (error) {
            console.error('[ClassificationFlow] 生成分类目录失败:', error);
            this.showError(error.message);
        }
    }
    
    showLoadingStep() {
        this.container.innerHTML = `
            <div class="flow-loading">
                <div class="flow-spinner"></div>
                <div class="flow-loading-text">
                    <h3>正在分析书签...</h3>
                    <p>AI正在分析您的 ${this.state.bookmarks.length} 个书签</p>
                    <p class="flow-loading-hint">请稍候，这可能需要几秒到几十秒</p>
                </div>
            </div>
        `;
    }
    
    async generateCategoryTree(bookmarks) {
        const response = await chrome.runtime.sendMessage({
            action: 'generateCategoryTree',
            bookmarks: bookmarks.map(b => ({
                id: b.id,
                title: b.title,
                url: b.url
            }))
        });
        
        if (!response.success) {
            throw new Error(response.error || '生成分类目录失败');
        }
        
        return {
            categoryTree: response.categoryTree,
            userProfile: response.userProfile
        };
    }
    
    showCategoryEditStep() {
        const categoryTree = this.state.categoryTree;
        
        this.container.innerHTML = `
            <div class="flow-folder-edit">
                <div class="flow-header">
                    <div class="flow-step-indicator">
                        <span class="step active">1. 生成分类目录</span>
                        <span class="step">2. 分类书签</span>
                        <span class="step">3. 确认应用</span>
                    </div>
                    <div class="flow-actions">
                        <button class="btn btn-secondary" id="flowCancel">取消</button>
                        <button class="btn btn-primary" id="flowConfirmCategories">确认分类目录</button>
                    </div>
                </div>
                <div class="flow-content">
                    <div class="flow-info">
                        <p>AI已为您生成以下分类目录，您可以：</p>
                        <ul>
                            <li>点击分类名称进行重命名</li>
                            <li>点击删除按钮移除不需要的分类</li>
                            <li>点击"添加分类"创建新分类</li>
                        </ul>
                    </div>
                    <div class="category-tree" id="categoryTree">
                        ${this.renderCategoryTreeEditor(categoryTree)}
                    </div>
                    <button class="btn btn-secondary" id="addCategoryBtn" style="margin-top: 12px;">
                        + 添加一级分类
                    </button>
                </div>
            </div>
        `;
        
        this.bindCategoryEditEvents();
    }
    
    renderCategoryTreeEditor(categories, level = 0) {
        return categories.map((category, index) => `
            <div class="category-item level-${level}" data-level="${level}" data-index="${index}">
                <div class="category-row">
                    <span class="category-icon">${level === 0 ? '📁' : '📄'}</span>
                    <input type="text" class="category-name-input" value="${this.escapeHtml(category.name)}" />
                    <button class="category-delete-btn" title="删除">×</button>
                    ${level === 0 ? '<button class="category-add-child-btn" title="添加子分类">+</button>' : ''}
                </div>
                ${category.children && category.children.length > 0 ? `
                    <div class="category-children">
                        ${this.renderCategoryTreeEditor(category.children, level + 1)}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
    
    bindCategoryEditEvents() {
        document.getElementById('flowCancel').addEventListener('click', () => {
            this.cancel();
        });
        
        document.getElementById('flowConfirmCategories').addEventListener('click', async () => {
            await this.confirmCategories();
        });
        
        document.getElementById('addCategoryBtn').addEventListener('click', () => {
            this.addCategory();
        });
        
        document.querySelectorAll('.category-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = e.target.closest('.category-item');
                item.remove();
            });
        });
        
        document.querySelectorAll('.category-add-child-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = e.target.closest('.category-item');
                this.addChildCategory(item);
            });
        });
    }
    
    addCategory() {
        const tree = document.getElementById('categoryTree');
        const index = tree.querySelectorAll('.category-item[data-level="0"]').length;
        
        const item = document.createElement('div');
        item.className = 'category-item level-0';
        item.dataset.level = '0';
        item.dataset.index = index;
        item.innerHTML = `
            <div class="category-row">
                <span class="category-icon">📁</span>
                <input type="text" class="category-name-input" value="新分类" />
                <button class="category-delete-btn" title="删除">×</button>
                <button class="category-add-child-btn" title="添加子分类">+</button>
            </div>
        `;
        
        tree.appendChild(item);
        
        item.querySelector('.category-delete-btn').addEventListener('click', () => {
            item.remove();
        });
        
        item.querySelector('.category-add-child-btn').addEventListener('click', () => {
            this.addChildCategory(item);
        });
        
        item.querySelector('.category-name-input').select();
    }
    
    addChildCategory(parentItem) {
        const childrenContainer = parentItem.querySelector('.category-children') || 
            this.createChildrenContainer(parentItem);
        
        const item = document.createElement('div');
        item.className = 'category-item level-1';
        item.dataset.level = '1';
        item.innerHTML = `
            <div class="category-row">
                <span class="category-icon">📄</span>
                <input type="text" class="category-name-input" value="新子分类" />
                <button class="category-delete-btn" title="删除">×</button>
            </div>
        `;
        
        childrenContainer.appendChild(item);
        
        item.querySelector('.category-delete-btn').addEventListener('click', () => {
            item.remove();
        });
        
        item.querySelector('.category-name-input').select();
    }
    
    createChildrenContainer(parentItem) {
        const container = document.createElement('div');
        container.className = 'category-children';
        parentItem.appendChild(container);
        return container;
    }
    
    collectCategoryTree() {
        const tree = document.getElementById('categoryTree');
        const categories = [];
        
        const processItem = (item) => {
            const nameInput = item.querySelector(':scope > .category-row .category-name-input');
            const name = nameInput ? nameInput.value.trim() : '';
            if (!name) return null;
            
            const category = { name };
            
            const childrenContainer = item.querySelector(':scope > .category-children');
            if (childrenContainer) {
                const childItems = childrenContainer.querySelectorAll(':scope > .category-item');
                const children = [];
                childItems.forEach(childItem => {
                    const childCategory = processItem(childItem);
                    if (childCategory) children.push(childCategory);
                });
                if (children.length > 0) {
                    category.children = children;
                }
            }
            
            return category;
        };
        
        const topLevelItems = tree.querySelectorAll(':scope > .category-item[data-level="0"]');
        topLevelItems.forEach(item => {
            const category = processItem(item);
            if (category) categories.push(category);
        });
        
        return categories;
    }
    
    async confirmCategories() {
        const categories = this.collectCategoryTree();
        
        if (categories.length === 0) {
            alert('请至少保留一个分类');
            return;
        }
        
        this.state.categoryTree = categories;
        this.state.step = 3;
        
        this.showClassifyingStep();
        
        try {
            const classification = await this.classifyBookmarksByTree(categories);
            this.state.classification = classification;
            this.showPreviewStep();
        } catch (error) {
            console.error('[ClassificationFlow] 分类失败:', error);
            this.showError(error.message);
        }
    }
    
    showClassifyingStep() {
        this.container.innerHTML = `
            <div class="flow-loading">
                <div class="flow-spinner"></div>
                <div class="flow-loading-text">
                    <h3>正在分类书签...</h3>
                    <p>AI正在将 ${this.state.bookmarks.length} 个书签分配到分类目录</p>
                </div>
            </div>
        `;
    }
    
    async classifyBookmarksByTree(categoryTree) {
        const response = await chrome.runtime.sendMessage({
            action: 'classifyBookmarksByTree',
            bookmarks: this.state.bookmarks.map(b => ({
                id: b.id,
                title: b.title,
                url: b.url
            })),
            categoryTree: categoryTree
        });
        
        if (!response.success) {
            throw new Error(response.error || '分类失败');
        }
        
        return response.classification;
    }
    
    flattenCategoryTree(categories, parentPath = '') {
        const result = [];
        
        for (const category of categories) {
            const currentPath = parentPath ? `${parentPath}/${category.name}` : category.name;
            result.push(currentPath);
            
            if (category.children && category.children.length > 0) {
                result.push(...this.flattenCategoryTree(category.children, currentPath));
            }
        }
        
        return result;
    }
    
    showPreviewStep() {
        const classification = this.state.classification;
        const categoryTree = this.state.categoryTree;
        
        console.log('[ClassificationFlow] 预览分类结果:', classification);
        
        const allPaths = this.flattenCategoryTree(categoryTree);
        const unclassifiedBookmarks = classification['未分类'] || [];
        const totalClassified = this.state.bookmarks.length - unclassifiedBookmarks.length;
        
        let folderHtml = '';
        
        allPaths.forEach((path, index) => {
            const bookmarks = classification[path] || [];
            const pathParts = path.split('/');
            const displayName = pathParts[pathParts.length - 1];
            const indent = pathParts.length - 1;
            
            folderHtml += `
                <div class="preview-folder collapsed" data-folder-index="${index}">
                    <div class="preview-folder-header" style="padding-left: ${indent * 20}px">
                        <span class="folder-toggle">
                            <svg width="12" height="12" viewBox="0 0 12 12">
                                <path d="M4 2L8 6L4 10" stroke="currentColor" stroke-width="1.5" fill="none"/>
                            </svg>
                        </span>
                        <span class="folder-icon">📁</span>
                        <span class="folder-name">${this.escapeHtml(displayName)}</span>
                        <span class="folder-count">${bookmarks.length} 个书签</span>
                    </div>
                    <div class="preview-bookmarks">
                        ${bookmarks.map(b => `
                            <div class="preview-bookmark">
                                ${this.getFaviconHtml(b.url)}
                                <span class="bookmark-title">${this.escapeHtml(b.title)}</span>
                            </div>
                        `).join('')}
                        ${bookmarks.length === 0 ? '<div class="preview-empty">（空分类）</div>' : ''}
                    </div>
                </div>
            `;
        });
        
        if (unclassifiedBookmarks.length > 0) {
            folderHtml += `
                <div class="preview-folder collapsed unclassified-folder" data-folder-index="unclassified">
                    <div class="preview-folder-header unclassified-header">
                        <span class="folder-toggle">
                            <svg width="12" height="12" viewBox="0 0 12 12">
                                <path d="M4 2L8 6L4 10" stroke="currentColor" stroke-width="1.5" fill="none"/>
                            </svg>
                        </span>
                        <span class="folder-icon">❓</span>
                        <span class="folder-name">未分类</span>
                        <span class="folder-count">${unclassifiedBookmarks.length} 个书签</span>
                    </div>
                    <div class="preview-bookmarks">
                        ${unclassifiedBookmarks.map(b => `
                            <div class="preview-bookmark">
                                ${this.getFaviconHtml(b.url)}
                                <span class="bookmark-title">${this.escapeHtml(b.title)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        this.container.innerHTML = `
            <div class="flow-preview">
                <div class="flow-header">
                    <div class="flow-step-indicator">
                        <span class="step done">1. 生成分类目录</span>
                        <span class="step done">2. 分类书签</span>
                        <span class="step active">3. 确认应用</span>
                    </div>
                    <div class="flow-actions">
                        <button class="btn btn-secondary" id="flowBack">返回修改</button>
                        <button class="btn btn-primary" id="flowApply">应用分类</button>
                    </div>
                </div>
                <div class="flow-content">
                    <div class="flow-warning">
                        <span class="warning-icon">⚠️</span>
                        <div>
                            <strong>重要提示</strong>
                            <p>应用分类后，您的书签将被移动到新的文件夹结构中。系统会在应用前自动备份。</p>
                        </div>
                    </div>
                    <div class="preview-stats">
                        <span>共 ${this.state.bookmarks.length} 个书签</span>
                        <span>${allPaths.length} 个分类</span>
                        ${unclassifiedBookmarks.length > 0 ? 
                            `<span class="unclassified-warning">${unclassifiedBookmarks.length} 个未分类</span>` : 
                            '<span class="all-classified">✓ 全部已分类</span>'}
                    </div>
                    <div class="preview-folders">
                        ${folderHtml}
                    </div>
                </div>
            </div>
        `;
        
        this.bindPreviewEvents();
    }
    
    bindPreviewEvents() {
        document.getElementById('flowBack').addEventListener('click', () => {
            this.state.step = 2;
            this.showCategoryEditStep();
        });
        
        document.getElementById('flowApply').addEventListener('click', async () => {
            await this.applyClassification();
        });
        
        document.querySelectorAll('.preview-folder-header').forEach(header => {
            header.addEventListener('click', () => {
                header.parentElement.classList.toggle('collapsed');
            });
        });
    }
    
    async applyClassification() {
        if (!confirm('确定要应用分类吗？这将移动您的书签到新的文件夹结构中。\n\n系统将自动备份当前书签，以便需要时恢复。')) {
            return;
        }
        
        try {
            const backupResponse = await chrome.runtime.sendMessage({
                action: 'backupBookmarks'
            });
            
            if (backupResponse.success) {
                console.log('[ClassificationFlow] 自动备份成功');
            }
        } catch (e) {
            console.warn('[ClassificationFlow] 自动备份失败:', e);
        }
        
        this.showApplyingStep();
        
        try {
            const allPaths = this.flattenCategoryTree(this.state.categoryTree);
            const folders = [...allPaths];
            if (this.state.classification['未分类'] && this.state.classification['未分类'].length > 0) {
                folders.push('未分类');
            }
            
            const response = await chrome.runtime.sendMessage({
                action: 'applyClassification',
                folders: folders,
                classification: this.state.classification
            });
            
            if (!response.success) {
                throw new Error(response.error);
            }
            
            this.showCompleteStep();
        } catch (error) {
            console.error('[ClassificationFlow] 应用分类失败:', error);
            this.showError(error.message);
        }
    }
    
    showApplyingStep() {
        this.container.innerHTML = `
            <div class="flow-loading">
                <div class="flow-spinner"></div>
                <div class="flow-loading-text">
                    <h3>正在应用分类...</h3>
                    <p>请稍候，正在移动书签到新文件夹</p>
                </div>
            </div>
        `;
    }
    
    showCompleteStep() {
        const allPaths = this.flattenCategoryTree(this.state.categoryTree);
        
        this.container.innerHTML = `
            <div class="flow-complete">
                <div class="complete-icon">✅</div>
                <h3>分类完成！</h3>
                <p>您的书签已成功整理到 ${allPaths.length} 个分类中</p>
                <div class="complete-stats">
                    <div class="stat-item">
                        <span class="stat-value">${this.state.bookmarks.length}</span>
                        <span class="stat-label">书签总数</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${allPaths.length}</span>
                        <span class="stat-label">分类数量</span>
                    </div>
                </div>
                <button class="btn btn-primary" id="flowDone">完成</button>
            </div>
        `;
        
        document.getElementById('flowDone').addEventListener('click', () => {
            this.complete();
        });
    }
    
    showError(message) {
        this.container.innerHTML = `
            <div class="flow-error">
                <div class="error-icon">❌</div>
                <h3>出错了</h3>
                <p>${this.escapeHtml(message)}</p>
                <div class="error-actions">
                    <button class="btn btn-secondary" id="flowCancel">返回</button>
                    <button class="btn btn-primary" id="flowRetry">重试</button>
                </div>
            </div>
        `;
        
        document.getElementById('flowCancel').addEventListener('click', () => {
            this.cancel();
        });
        
        document.getElementById('flowRetry').addEventListener('click', () => {
            this.start(this.state.bookmarks);
        });
    }
    
    cancel() {
        this.container.innerHTML = this.originalContent;
        this.container.style.overflow = this.originalOverflow;
        this.options.onCancel();
    }
    
    complete() {
        this.container.innerHTML = this.originalContent;
        this.container.style.overflow = this.originalOverflow;
        this.options.onComplete();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
    
    getDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return '';
        }
    }
    
    getFaviconUrl(url, size = 16) {
        if (!url) return null;
        
        try {
            const fUrl = new URL(chrome.runtime.getURL("/_favicon/"));
            fUrl.searchParams.set("pageUrl", url);
            fUrl.searchParams.set("size", String(size));
            return fUrl.toString();
        } catch (e) {
            console.warn('[ClassificationFlow] 构造favicon URL失败:', e);
            return null;
        }
    }
    
    getFaviconHtml(url) {
        const faviconUrl = this.getFaviconUrl(url);
        const emoji = this.getFaviconEmoji(url);
        
        if (faviconUrl) {
            return `<img src="${this.escapeHtml(faviconUrl)}" 
                         class="bookmark-favicon" 
                         loading="lazy"
                         alt=""
                         onerror="this.style.display='none';this.nextElementSibling.style.display='inline';" />
                    <span class="favicon-emoji" style="display:none;">${emoji}</span>`;
        }
        
        return `<span class="favicon-emoji">${emoji}</span>`;
    }
    
    getFaviconEmoji(url) {
        if (!url) return '📄';
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            const emojiMap = {
                'github.com': '🐙',
                'youtube.com': '📺',
                'twitter.com': '🐦',
                'x.com': '🐦',
                'facebook.com': '📘',
                'linkedin.com': '💼',
                'reddit.com': '🤖',
                'stackoverflow.com': '📚',
                'google.com': '🔍',
                'gmail.com': '📧',
                'amazon.com': '🛒',
                'netflix.com': '🎬',
                'spotify.com': '🎵',
                'weibo.com': '📱',
                'bilibili.com': '📺',
                'zhihu.com': '💡',
                'taobao.com': '🛒',
                'jd.com': '🛒',
                'qq.com': '💬',
                'wechat.com': '💬',
                'douyin.com': '🎵',
                'tiktok.com': '🎵'
            };
            
            for (const [key, emoji] of Object.entries(emojiMap)) {
                if (domain.includes(key)) return emoji;
            }
            
            return '🔗';
        } catch {
            return '📄';
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClassificationFlow;
}
