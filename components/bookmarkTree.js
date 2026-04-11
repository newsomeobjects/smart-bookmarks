class BookmarkTree {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        this.options = {
            onNodeClick: options.onNodeClick || (() => {}),
            onNodeDoubleClick: options.onNodeDoubleClick || (() => {}),
            onNodeContextMenu: options.onNodeContextMenu || (() => {}),
            showIcons: options.showIcons !== false,
            lazyLoad: options.lazyLoad !== false,
            ...options
        };
        
        this.nodes = new Map();
        this.selectedNode = null;
        this.loadingNodes = new Set();
        this.bookmarkCache = new Map();
        
        this.init();
    }
    
    init() {
        this.container.innerHTML = '';
        this.container.className = 'bookmark-tree-container';
        this.container.setAttribute('role', 'tree');
        this.container.setAttribute('aria-label', '书签树');
        this.setupFaviconErrorHandling();
    }
    
    async loadBookmarksBar() {
        try {
            await this.loadCache();
            
            const tree = await chrome.bookmarks.getTree();
            const root = tree[0];
            
            if (!root || !root.children) {
                this.showError('无法加载书签数据');
                return;
            }
            
            const bookmarkBar = root.children.find(
                node => node.id === '1' || 
                        node.title === '书签栏' || 
                        node.title === 'Bookmarks bar'
            );
            
            if (!bookmarkBar) {
                this.showError('未找到书签栏');
                return;
            }
            
            this.render(bookmarkBar);
        } catch (error) {
            console.error('[BookmarkTree] 加载书签失败:', error);
            this.showError('加载书签失败: ' + error.message);
        }
    }
    
    async loadCache() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'getBookmarkCache'
            });
            
            if (response && response.success && response.bookmarks) {
                this.bookmarkCache.clear();
                response.bookmarks.forEach(bookmark => {
                    this.bookmarkCache.set(bookmark.id, bookmark);
                });
                console.log('[BookmarkTree] 缓存已加载，书签数:', this.bookmarkCache.size);
            }
        } catch (error) {
            console.warn('[BookmarkTree] 加载缓存失败:', error);
        }
    }
    
    render(rootNode) {
        this.container.innerHTML = '';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'tree-root-wrapper';
        
        const children = rootNode.children || [];
        children.sort((a, b) => {
            if (a.url && !b.url) return 1;
            if (!a.url && b.url) return -1;
            return 0;
        });
        
        children.forEach(child => {
            if (child.url) {
                const bookmarkElement = this.createBookmarkNode(child);
                wrapper.appendChild(bookmarkElement);
            } else {
                const folderElement = this.createFolderNode(child, false);
                wrapper.appendChild(folderElement);
            }
        });
        
        if (children.length === 0) {
            wrapper.innerHTML = '<div class="tree-empty">书签栏为空</div>';
        }
        
        this.container.appendChild(wrapper);
    }
    
    createFolderNode(node, isRoot = false) {
        const nodeElement = document.createElement('div');
        nodeElement.className = 'tree-node folder' + (isRoot ? ' root' : '');
        nodeElement.setAttribute('role', 'treeitem');
        nodeElement.setAttribute('aria-expanded', 'false');
        nodeElement.dataset.id = node.id;
        nodeElement.dataset.type = 'folder';
        
        const header = document.createElement('div');
        header.className = 'tree-node-header';
        header.innerHTML = `
            <span class="tree-toggle">
                <svg width="12" height="12" viewBox="0 0 12 12">
                    <path d="M4 2L8 6L4 10" stroke="currentColor" stroke-width="1.5" fill="none"/>
                </svg>
            </span>
            ${this.options.showIcons ? '<span class="tree-icon folder-icon">📁</span>' : ''}
            <span class="tree-label">${this.escapeHtml(node.title)}</span>
            <span class="tree-badge" style="display: none;">0</span>
        `;
        
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';
        childrenContainer.setAttribute('role', 'group');
        
        nodeElement.appendChild(header);
        nodeElement.appendChild(childrenContainer);
        
        this.nodes.set(node.id, {
            element: nodeElement,
            data: node,
            loaded: false,
            expanded: false
        });
        
        header.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleNode(node.id);
        });
        
        header.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.options.onNodeContextMenu({
                node: node,
                type: 'folder',
                event: e
            });
        });
        
        return nodeElement;
    }
    
    createBookmarkNode(bookmark) {
        const cachedBookmark = this.bookmarkCache.get(bookmark.id);
        const bookmarkData = cachedBookmark || bookmark;
        
        const nodeElement = document.createElement('div');
        nodeElement.className = 'tree-node bookmark';
        nodeElement.setAttribute('role', 'treeitem');
        nodeElement.dataset.id = bookmark.id;
        nodeElement.dataset.type = 'bookmark';
        nodeElement.dataset.url = bookmarkData.url || '';
        
        let favicon = '';
        if (cachedBookmark && cachedBookmark.favicon) {
            favicon = this.getFaviconHtml(cachedBookmark.favicon);
        } else if (bookmarkData.url) {
            const faviconUrl = this.getFaviconUrl(bookmarkData.url);
            if (faviconUrl) {
                favicon = this.getFaviconHtml(faviconUrl);
            }
        }
        
        nodeElement.innerHTML = `
            <div class="tree-node-header">
                <span class="tree-toggle placeholder"></span>
                ${this.options.showIcons ? `<span class="tree-icon bookmark-icon">${favicon}</span>` : ''}
                <span class="tree-label" title="${this.escapeHtml(bookmarkData.url || '')}">${this.escapeHtml(bookmarkData.title)}</span>
            </div>
        `;
        
        this.nodes.set(bookmark.id, {
            element: nodeElement,
            data: bookmarkData,
            loaded: true,
            expanded: false
        });
        
        nodeElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectNode(bookmark.id);
            this.options.onNodeClick({
                node: bookmarkData,
                type: 'bookmark',
                event: e
            });
        });
        
        nodeElement.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.options.onNodeDoubleClick({
                node: bookmarkData,
                type: 'bookmark',
                event: e
            });
        });
        
        nodeElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.options.onNodeContextMenu({
                node: bookmarkData,
                type: 'bookmark',
                event: e
            });
        });
        
        return nodeElement;
    }
    
    async toggleNode(nodeId) {
        const nodeInfo = this.nodes.get(nodeId);
        if (!nodeInfo) return;
        
        const { element, expanded, loaded } = nodeInfo;
        
        if (expanded) {
            this.collapseNode(nodeId);
        } else {
            if (!loaded && this.options.lazyLoad) {
                await this.loadChildren(nodeId, element);
            }
            this.expandNode(nodeId);
        }
    }
    
    expandNode(nodeId) {
        const nodeInfo = this.nodes.get(nodeId);
        if (!nodeInfo) return;
        
        const { element } = nodeInfo;
        element.classList.add('expanded');
        element.setAttribute('aria-expanded', 'true');
        nodeInfo.expanded = true;
    }
    
    collapseNode(nodeId) {
        const nodeInfo = this.nodes.get(nodeId);
        if (!nodeInfo) return;
        
        const { element } = nodeInfo;
        element.classList.remove('expanded');
        element.setAttribute('aria-expanded', 'false');
        nodeInfo.expanded = false;
    }
    
    async loadChildren(parentId, parentElement) {
        if (this.loadingNodes.has(parentId)) return;
        this.loadingNodes.add(parentId);
        
        const childrenContainer = parentElement.querySelector('.tree-children');
        const toggle = parentElement.querySelector('.tree-toggle');
        const badge = parentElement.querySelector('.tree-badge');
        
        toggle.classList.add('loading');
        
        try {
            const children = await chrome.bookmarks.getChildren(parentId);
            
            childrenContainer.innerHTML = '';
            
            const folders = children.filter(c => !c.url);
            const bookmarks = children.filter(c => c.url);
            
            let totalCount = 0;
            
            folders.forEach(folder => {
                const folderElement = this.createFolderNode(folder);
                childrenContainer.appendChild(folderElement);
                totalCount++;
            });
            
            bookmarks.forEach(bookmark => {
                const bookmarkElement = this.createBookmarkNode(bookmark);
                childrenContainer.appendChild(bookmarkElement);
                totalCount++;
            });
            
            const nodeInfo = this.nodes.get(parentId);
            if (nodeInfo) {
                nodeInfo.loaded = true;
            }
            
            if (badge && totalCount > 0) {
                badge.textContent = totalCount;
                badge.style.display = 'inline';
            }
            
            if (children.length === 0) {
                childrenContainer.innerHTML = '<div class="tree-empty">（空文件夹）</div>';
            }
            
        } catch (error) {
            console.error('[BookmarkTree] 加载子节点失败:', error);
            childrenContainer.innerHTML = '<div class="tree-error">加载失败</div>';
        } finally {
            toggle.classList.remove('loading');
            this.loadingNodes.delete(parentId);
        }
    }
    
    selectNode(nodeId) {
        if (this.selectedNode) {
            const prevNode = this.nodes.get(this.selectedNode);
            if (prevNode) {
                prevNode.element.classList.remove('selected');
            }
        }
        
        const nodeInfo = this.nodes.get(nodeId);
        if (nodeInfo) {
            nodeInfo.element.classList.add('selected');
            this.selectedNode = nodeId;
        }
    }
    
    async refreshNode(nodeId) {
        const nodeInfo = this.nodes.get(nodeId);
        if (!nodeInfo) return;
        
        nodeInfo.loaded = false;
        nodeInfo.expanded = false;
        
        const childrenContainer = nodeInfo.element.querySelector('.tree-children');
        childrenContainer.innerHTML = '';
        
        await this.loadChildren(nodeId, nodeInfo.element);
        this.expandNode(nodeId);
    }
    
    async refresh() {
        this.nodes.clear();
        this.selectedNode = null;
        await this.loadBookmarksBar();
    }
    
    showError(message) {
        this.container.innerHTML = `
            <div class="tree-error-message">
                <span class="error-icon">⚠️</span>
                <span>${this.escapeHtml(message)}</span>
            </div>
        `;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
    
    getFaviconUrl(url, size = 16) {
        if (!url) return null;
        
        try {
            const fUrl = new URL(chrome.runtime.getURL("/_favicon/"));
            fUrl.searchParams.set("pageUrl", url);
            fUrl.searchParams.set("size", String(size));
            return fUrl.toString();
        } catch (e) {
            return null;
        }
    }
    
    getFaviconHtml(faviconUrl) {
        if (!faviconUrl) return '';

        return `<img src="${this.escapeHtml(faviconUrl)}" 
                     class="favicon" 
                     loading="lazy"
                     alt="" />`;
    }

    setupFaviconErrorHandling() {
        this.container.addEventListener('error', (e) => {
            if (e.target.classList.contains('favicon')) {
                e.target.style.display = 'none';
            }
        }, true);
    }
    
    expandAll() {
        this.nodes.forEach((nodeInfo, nodeId) => {
            if (nodeInfo.data.url === undefined) {
                this.expandNode(nodeId);
            }
        });
    }
    
    collapseAll() {
        this.nodes.forEach((nodeInfo, nodeId) => {
            if (nodeInfo.data.url === undefined) {
                this.collapseNode(nodeId);
            }
        });
    }
    
    getSelectedNode() {
        if (!this.selectedNode) return null;
        const nodeInfo = this.nodes.get(this.selectedNode);
        return nodeInfo ? nodeInfo.data : null;
    }
    
    search(query) {
        const lowerQuery = query.toLowerCase();
        
        this.nodes.forEach((nodeInfo) => {
            const { element, data } = nodeInfo;
            const label = element.querySelector('.tree-label');
            
            if (data.title.toLowerCase().includes(lowerQuery) ||
                (data.url && data.url.toLowerCase().includes(lowerQuery))) {
                element.classList.remove('hidden');
                element.classList.add('match');
                if (label) {
                    label.innerHTML = this.highlightMatch(data.title, query);
                }
            } else {
                element.classList.add('hidden');
                element.classList.remove('match');
                if (label) {
                    label.textContent = data.title;
                }
            }
        });
    }
    
    clearSearch() {
        this.nodes.forEach((nodeInfo) => {
            const { element, data } = nodeInfo;
            element.classList.remove('hidden', 'match');
            const label = element.querySelector('.tree-label');
            if (label) {
                label.textContent = data.title;
            }
        });
    }
    
    highlightMatch(text, query) {
        const escaped = this.escapeHtml(text);
        const escapedQuery = this.escapeHtml(query);
        const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return escaped.replace(regex, '<mark>$1</mark>');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BookmarkTree;
}
