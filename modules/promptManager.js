const PromptManager = {
    CACHE_KEY: 'aimark_prompts',
    initialized: false,
    cache: new Map(),
    
    DEFAULT_PROMPTS: {
        'system': {
            id: 'system',
            name: '系统提示词',
            content: `你是一个专业的书签分类助手。你的任务是帮助用户整理和分类书签。

规则：
1. 分类名称必须简洁，2-6个中文字符或2-10个英文字符
2. 分类名称不能包含URL、特殊字符或数字开头
3. 优先使用已有的分类名称
4. 如果需要创建新分类，确保分类名称具有通用性和可理解性
5. 返回的JSON格式必须严格符合要求
6. 不要添加任何解释性文字，只返回JSON

你需要为用户的书签生成分类名称列表。`
        },
        'classification/generate-tree': {
            id: 'generate-tree',
            name: '生成分类目录',
            content: `请分析以下书签摘要，生成一个结构化的分类目录。

书签摘要列表：
{bookmarkSummaries}

要求：
1. 分类目录最大层数：{maxDepth}层
2. 一级分类数量不超过{maxCategories}个
3. 每个分类名称2-6个中文字符或2-10个英文字符
4. 分类应覆盖所有书签类型
5. 分类名称要通用、易懂
6. 不要包含"未分类"类别，系统会自动添加
7. 同时生成用户画像，用于后续分类优化

请返回JSON格式：
{
  "categories": [
    {
      "name": "分类名称",
      "children": [
        { "name": "子分类名称" }
      ]
    }
  ],
  "userProfile": {
    "interests": ["兴趣1", "兴趣2"],
    "professions": ["职业领域"],
    "summary": "用户画像简述"
  }
}`
        },
        'classification/classify-by-tree': {
            id: 'classify-by-tree',
            name: '按目录分类书签',
            content: `请根据以下分类目录，为每个书签分配最合适的分类路径。

分类目录：
{categoryTree}

书签列表：
{bookmarkList}

【归类要求】
1. 为每个书签分配一个分类路径，格式为"一级分类/二级分类"或"一级分类"
2. 如果书签不适合任何已有分类，分配路径为"未分类"
3. 分类路径必须来自分类目录中存在的分类
4. 每个归类结果必须包含简洁、准确的归类理由，说明归类决策依据

【输出格式】
必须严格遵循以下JSON结构，包含自校验字段：
{
  "success": true,
  "total": 5,
  "assignments": [
    {
      "id": "书签ID",
      "index": 1,
      "title": "书签标题",
      "path": "技术开发/后端",
      "reason": "内容涉及Python编程，属于后端技术"
    }
  ],
  "validation": {
    "allClassified": true,
    "validPaths": true,
    "hasReasons": true
  }
}

【自校验规则】
- success: 所有书签是否都已归类
- total: 归类书签总数
- allClassified: 是否每个书签都有分类路径
- validPaths: 所有路径是否都在分类目录中
- hasReasons: 是否每个结果都有归类理由

请确保输出严格符合JSON格式，不要添加任何解释性文字。`
        },
        'single/classify-single': {
            id: 'classify-single',
            name: '单书签分类',
            content: `请分析以下书签并返回最合适的分类。

现有分类文件夹：{existingFolders}

书签信息：
- 标题：{title}
- URL：{url}

请返回JSON格式：
{
    "category": "分类名称",
    "confidence": 0.95,
    "isNewCategory": false
}`
        }
    },
    
    async init() {
        if (this.initialized) return;
        
        try {
            await this.loadFromStorage();
            this.initialized = true;
            console.log('[PromptManager] 初始化完成');
        } catch (error) {
            console.error('[PromptManager] 初始化失败:', error);
            this.loadDefaults();
        }
    },
    
    async loadFromStorage() {
        try {
            const result = await chrome.storage.local.get([this.CACHE_KEY]);
            const stored = result[this.CACHE_KEY];
            
            if (stored && typeof stored === 'object') {
                this.cache.clear();
                for (const [key, value] of Object.entries(stored)) {
                    this.cache.set(key, value);
                }
                console.log('[PromptManager] 从存储加载提示词:', this.cache.size, '个');
            } else {
                this.loadDefaults();
            }
        } catch (error) {
            console.warn('[PromptManager] 从存储加载失败:', error);
            this.loadDefaults();
        }
    },
    
    loadDefaults() {
        this.cache.clear();
        for (const [key, value] of Object.entries(this.DEFAULT_PROMPTS)) {
            this.cache.set(key, value);
        }
        console.log('[PromptManager] 加载默认提示词:', this.cache.size, '个');
    },
    
    async saveToStorage() {
        try {
            const data = {};
            for (const [key, value] of this.cache) {
                data[key] = value;
            }
            await chrome.storage.local.set({ [this.CACHE_KEY]: data });
            console.log('[PromptManager] 提示词已保存到存储');
        } catch (error) {
            console.error('[PromptManager] 保存到存储失败:', error);
        }
    },
    
    get(promptId) {
        if (!this.initialized) {
            console.warn('[PromptManager] 未初始化，返回默认提示词');
            return this.DEFAULT_PROMPTS[promptId]?.content || '';
        }
        
        const cached = this.cache.get(promptId);
        if (cached && cached.content) {
            return cached.content;
        }
        
        const defaultPrompt = this.DEFAULT_PROMPTS[promptId];
        return defaultPrompt?.content || '';
    },
    
    getPromptInfo(promptId) {
        const cached = this.cache.get(promptId);
        if (cached) {
            return cached;
        }
        return this.DEFAULT_PROMPTS[promptId] || null;
    },
    
    getAll() {
        const result = {};
        for (const [key, value] of this.cache) {
            result[key] = value;
        }
        return result;
    },
    
    async set(promptId, content) {
        const existing = this.cache.get(promptId) || this.DEFAULT_PROMPTS[promptId] || {};
        this.cache.set(promptId, {
            ...existing,
            id: promptId,
            content: content
        });
        await this.saveToStorage();
    },
    
    async reset(promptId) {
        const defaultPrompt = this.DEFAULT_PROMPTS[promptId];
        if (defaultPrompt) {
            this.cache.set(promptId, { ...defaultPrompt });
            await this.saveToStorage();
            return true;
        }
        return false;
    },
    
    async resetAll() {
        this.loadDefaults();
        await this.saveToStorage();
    },
    
    render(promptId, variables = {}) {
        let content = this.get(promptId);
        
        if (!content) {
            console.warn(`[PromptManager] 提示词不存在: ${promptId}`);
            return '';
        }
        
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{${key}}`;
            content = content.replace(new RegExp(placeholder, 'g'), String(value));
        }
        
        return content;
    },
    
    listCategories() {
        const categories = new Set();
        for (const key of this.cache.keys()) {
            const parts = key.split('/');
            if (parts.length > 1) {
                categories.add(parts[0]);
            }
        }
        return Array.from(categories);
    },
    
    listByCategory(category) {
        const result = [];
        for (const [key, value] of this.cache) {
            if (key.startsWith(category + '/') || key === category) {
                result.push({ id: key, ...value });
            }
        }
        return result;
    },
    
    validate(promptId, content) {
        if (!content || typeof content !== 'string') {
            return { valid: false, error: '提示词内容不能为空' };
        }
        
        const variablePattern = /\{(\w+)\}/g;
        const variables = [];
        let match;
        while ((match = variablePattern.exec(content)) !== null) {
            variables.push(match[1]);
        }
        
        return { valid: true, variables };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromptManager;
}
