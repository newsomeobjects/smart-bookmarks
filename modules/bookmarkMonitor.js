const BookmarkMonitor = {
    CACHE_KEY: 'aimark_bookmark_cache',
    CACHE_EXPIRY: 24 * 60 * 60 * 1000,
    
    cache: {
        bookmarks: [],
        folders: {},
        lastUpdate: 0
    },
    
    listeners: new Set(),
    
    async init() {
        await this.loadCache();
        this.setupListeners();
        console.log('[BookmarkMonitor] 初始化完成');
    },
    
    async loadCache() {
        try {
            const result = await chrome.storage.local.get([this.CACHE_KEY]);
            if (result[this.CACHE_KEY]) {
                const cached = result[this.CACHE_KEY];
                if (Date.now() - cached.lastUpdate < this.CACHE_EXPIRY) {
                    this.cache = cached;
                    console.log('[BookmarkMonitor] 从缓存加载书签数据');
                    return;
                }
            }
            await this.refreshCache();
        } catch (error) {
            console.error('[BookmarkMonitor] 加载缓存失败:', error);
            await this.refreshCache();
        }
    },
    
    async refreshCache() {
        try {
            const tree = await chrome.bookmarks.getTree();
            const bookmarks = [];
            const folders = {};
            
            const traverse = (nodes, parentPath = []) => {
                for (const node of nodes) {
                    if (node.url) {
                        bookmarks.push({
                            id: node.id,
                            title: node.title,
                            url: node.url,
                            parentId: node.parentId,
                            dateAdded: node.dateAdded,
                            path: parentPath
                        });
                    } else if (node.title) {
                        folders[node.id] = {
                            id: node.id,
                            title: node.title,
                            parentId: node.parentId,
                            path: parentPath
                        };
                        if (node.children) {
                            traverse(node.children, [...parentPath, node.title]);
                        }
                    } else if (node.children) {
                        traverse(node.children, parentPath);
                    }
                }
            };
            
            traverse(tree);
            
            this.cache = {
                bookmarks,
                folders,
                lastUpdate: Date.now()
            };
            
            await this.saveCache();
            console.log(`[BookmarkMonitor] 缓存已刷新: ${bookmarks.length} 个书签, ${Object.keys(folders).length} 个文件夹`);
        } catch (error) {
            console.error('[BookmarkMonitor] 刷新缓存失败:', error);
        }
    },
    
    async saveCache() {
        try {
            await chrome.storage.local.set({ [this.CACHE_KEY]: this.cache });
        } catch (error) {
            console.error('[BookmarkMonitor] 保存缓存失败:', error);
        }
    },
    
    setupListeners() {
        chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
            console.log('[BookmarkMonitor] 书签创建:', id, bookmark.title);
            await this.handleBookmarkCreated(id, bookmark);
        });
        
        chrome.bookmarks.onRemoved.addListener(async (id, removeInfo) => {
            console.log('[BookmarkMonitor] 书签删除:', id);
            await this.handleBookmarkRemoved(id, removeInfo);
        });
        
        chrome.bookmarks.onChanged.addListener(async (id, changeInfo) => {
            console.log('[BookmarkMonitor] 书签修改:', id);
            await this.handleBookmarkChanged(id, changeInfo);
        });
        
        chrome.bookmarks.onMoved.addListener(async (id, moveInfo) => {
            console.log('[BookmarkMonitor] 书签移动:', id);
            await this.handleBookmarkMoved(id, moveInfo);
        });
    },
    
    async handleBookmarkCreated(id, bookmark) {
        if (bookmark.url) {
            this.cache.bookmarks.push({
                id: bookmark.id,
                title: bookmark.title,
                url: bookmark.url,
                parentId: bookmark.parentId,
                dateAdded: bookmark.dateAdded,
                path: []
            });
        } else {
            this.cache.folders[bookmark.id] = {
                id: bookmark.id,
                title: bookmark.title,
                parentId: bookmark.parentId,
                path: []
            };
        }
        
        await this.saveCache();
        this.notifyListeners('created', { id, bookmark });
    },
    
    async handleBookmarkRemoved(id, removeInfo) {
        this.cache.bookmarks = this.cache.bookmarks.filter(b => b.id !== id);
        delete this.cache.folders[id];
        await this.saveCache();
        this.notifyListeners('removed', { id, removeInfo });
    },
    
    async handleBookmarkChanged(id, changeInfo) {
        const bookmark = this.cache.bookmarks.find(b => b.id === id);
        if (bookmark) {
            if (changeInfo.title) bookmark.title = changeInfo.title;
            if (changeInfo.url) bookmark.url = changeInfo.url;
        }
        
        if (this.cache.folders[id] && changeInfo.title) {
            this.cache.folders[id].title = changeInfo.title;
        }
        
        await this.saveCache();
        this.notifyListeners('changed', { id, changeInfo });
    },
    
    async handleBookmarkMoved(id, moveInfo) {
        const bookmark = this.cache.bookmarks.find(b => b.id === id);
        if (bookmark) {
            bookmark.parentId = moveInfo.parentId;
        }
        
        if (this.cache.folders[id]) {
            this.cache.folders[id].parentId = moveInfo.parentId;
        }
        
        await this.saveCache();
        this.notifyListeners('moved', { id, moveInfo });
    },
    
    addListener(callback) {
        this.listeners.add(callback);
    },
    
    removeListener(callback) {
        this.listeners.delete(callback);
    },
    
    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('[BookmarkMonitor] 监听器回调错误:', error);
            }
        });
    },
    
    getAllBookmarks() {
        return [...this.cache.bookmarks];
    },
    
    getBookmarksInFolder(folderId) {
        return this.cache.bookmarks.filter(b => b.parentId === folderId);
    },
    
    getFolder(folderId) {
        return this.cache.folders[folderId] || null;
    },
    
    getAllFolders() {
        return Object.values(this.cache.folders);
    },
    
    getBookmarkById(id) {
        return this.cache.bookmarks.find(b => b.id === id) || null;
    },
    
    searchBookmarks(query) {
        const lowerQuery = query.toLowerCase();
        return this.cache.bookmarks.filter(b => 
            b.title.toLowerCase().includes(lowerQuery) ||
            b.url.toLowerCase().includes(lowerQuery)
        );
    },
    
    async getBookmarkBarId() {
        const tree = await chrome.bookmarks.getTree();
        if (tree && tree[0] && tree[0].children) {
            const bookmarkBar = tree[0].children.find(
                node => node.id === '1' || 
                        node.title === '书签栏' || 
                        node.title === 'Bookmarks bar'
            );
            return bookmarkBar ? bookmarkBar.id : '1';
        }
        return '1';
    },
    
    async getOtherBookmarksId() {
        const tree = await chrome.bookmarks.getTree();
        if (tree && tree[0] && tree[0].children) {
            const other = tree[0].children.find(
                node => node.id === '2' || 
                        node.title === '其他书签' || 
                        node.title === 'Other bookmarks'
            );
            return other ? other.id : '2';
        }
        return '2';
    },
    
    async getBookmarksBarBookmarks() {
        const barId = await this.getBookmarkBarId();
        return this.cache.bookmarks.filter(b => b.parentId === barId);
    },
    
    async getOtherBookmarks() {
        const otherId = await this.getOtherBookmarksId();
        return this.cache.bookmarks.filter(b => b.parentId === otherId);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BookmarkMonitor;
}
