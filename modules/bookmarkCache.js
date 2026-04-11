const BookmarkCache = {
    bookmarks: new Map(),
    initialized: false,
    
    async init() {
        if (this.initialized) return;
        
        await this.loadAllBookmarks();
        this.setupListeners();
        this.initialized = true;
        console.log('[BookmarkCache] 初始化完成，缓存书签数:', this.bookmarks.size);
    },
    
    async loadAllBookmarks() {
        try {
            const tree = await chrome.bookmarks.getTree();
            this.traverseTree(tree);
        } catch (error) {
            console.error('[BookmarkCache] 加载书签失败:', error);
        }
    },
    
    traverseTree(nodes) {
        for (const node of nodes) {
            if (node.url) {
                this.bookmarks.set(node.id, {
                    id: node.id,
                    title: node.title,
                    url: node.url,
                    dateAdded: node.dateAdded,
                    parentId: node.parentId,
                    index: node.index,
                    favicon: this.getFaviconUrl(node.url)
                });
            }
            
            if (node.children) {
                this.traverseTree(node.children);
            }
        }
    },
    
    getFaviconUrl(url, size = 16) {
        if (!url) return null;

        try {
            const fUrl = new URL(chrome.runtime.getURL("/_favicon/"));
            fUrl.searchParams.set("pageUrl", url);
            fUrl.searchParams.set("size", String(size));
            return fUrl.toString();
        } catch (e) {
            console.warn('[BookmarkCache] 构造favicon URL失败:', e);
            return null;
        }
    },
    
    setupListeners() {
        chrome.bookmarks.onCreated.addListener((id, bookmark) => {
            if (bookmark.url) {
                this.bookmarks.set(id, {
                    id: bookmark.id,
                    title: bookmark.title,
                    url: bookmark.url,
                    dateAdded: bookmark.dateAdded,
                    parentId: bookmark.parentId,
                    index: bookmark.index,
                    favicon: this.getFaviconUrl(bookmark.url)
                });
                console.log('[BookmarkCache] 书签已添加:', id);
            }
        });
        
        chrome.bookmarks.onRemoved.addListener((id) => {
            this.bookmarks.delete(id);
            console.log('[BookmarkCache] 书签已删除:', id);
        });
        
        chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
            const existing = this.bookmarks.get(id);
            if (existing) {
                this.bookmarks.set(id, {
                    ...existing,
                    title: changeInfo.title || existing.title,
                    url: changeInfo.url || existing.url,
                    favicon: changeInfo.url ? this.getFaviconUrl(changeInfo.url) : existing.favicon
                });
                console.log('[BookmarkCache] 书签已更新:', id);
            }
        });
        
        chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
            const existing = this.bookmarks.get(id);
            if (existing) {
                this.bookmarks.set(id, {
                    ...existing,
                    parentId: moveInfo.parentId,
                    index: moveInfo.index
                });
                console.log('[BookmarkCache] 书签已移动:', id);
            }
        });
    },
    
    get(id) {
        return this.bookmarks.get(id) || null;
    },
    
    getAll() {
        return Array.from(this.bookmarks.values());
    },
    
    getByParentId(parentId) {
        return this.getAll().filter(b => b.parentId === parentId);
    },
    
    search(query) {
        const lowerQuery = query.toLowerCase();
        return this.getAll().filter(b => 
            b.title.toLowerCase().includes(lowerQuery) ||
            b.url.toLowerCase().includes(lowerQuery)
        );
    },
    
    clear() {
        this.bookmarks.clear();
        this.initialized = false;
    },
    
    async refresh() {
        this.bookmarks.clear();
        await this.loadAllBookmarks();
        console.log('[BookmarkCache] 缓存已刷新，书签数:', this.bookmarks.size);
    },
    
    getStats() {
        return {
            total: this.bookmarks.size,
            initialized: this.initialized
        };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BookmarkCache;
}
