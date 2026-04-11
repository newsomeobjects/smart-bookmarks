const ConfigManager = {
    STORAGE_KEY: 'aimark_config',
    
    PROVIDERS: {
        deepseek: {
            name: 'DeepSeek',
            endpoint: 'https://api.deepseek.com/v1/chat/completions',
            model: 'deepseek-chat',
            maxTokens: 4000
        },
        zhipu: {
            name: '智谱AI',
            endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            model: 'glm-4-flash',
            maxTokens: 4000
        },
        openai: {
            name: 'OpenAI',
            endpoint: 'https://api.openai.com/v1/chat/completions',
            model: 'gpt-4o-mini',
            maxTokens: 4000
        }
    },
    
    defaultConfig: {
        ai: {
            provider: 'deepseek',
            apiKey: '',
            endpoint: 'https://api.deepseek.com/v1/chat/completions',
            model: 'deepseek-chat',
            temperature: 0.3,
            maxTokens: 4000
        },
        classification: {
            autoClassify: false,
            maxFolders: 10,
            maxDepth: 2,
            batchSize: 30
        },
        general: {
            showNotifications: true
        }
    },

    async init() {
        const config = await this.getAll();
        if (!config || Object.keys(config).length === 0) {
            await this.setAll(this.defaultConfig);
        }
        console.log('[ConfigManager] 配置初始化完成');
    },

    async get(key) {
        try {
            const result = await chrome.storage.local.get([this.STORAGE_KEY]);
            const config = result[this.STORAGE_KEY] || this.defaultConfig;
            return key ? config[key] : config;
        } catch (error) {
            console.error('[ConfigManager] 获取配置失败:', error);
            return key ? this.defaultConfig[key] : this.defaultConfig;
        }
    },

    async set(key, value) {
        try {
            const config = await this.getAll();
            config[key] = value;
            await chrome.storage.local.set({ [this.STORAGE_KEY]: config });
            console.log('[ConfigManager] 配置已更新:', key);
            return true;
        } catch (error) {
            console.error('[ConfigManager] 设置配置失败:', error);
            return false;
        }
    },

    async getAll() {
        try {
            const result = await chrome.storage.local.get([this.STORAGE_KEY]);
            return result[this.STORAGE_KEY] || this.defaultConfig;
        } catch (error) {
            console.error('[ConfigManager] 获取所有配置失败:', error);
            return this.defaultConfig;
        }
    },

    async setAll(config) {
        try {
            await chrome.storage.local.set({ [this.STORAGE_KEY]: config });
            console.log('[ConfigManager] 所有配置已保存');
            return true;
        } catch (error) {
            console.error('[ConfigManager] 保存所有配置失败:', error);
            return false;
        }
    },

    async reset() {
        try {
            await chrome.storage.local.set({ [this.STORAGE_KEY]: this.defaultConfig });
            console.log('[ConfigManager] 配置已重置为默认值');
            return true;
        } catch (error) {
            console.error('[ConfigManager] 重置配置失败:', error);
            return false;
        }
    },

    async getAIConfig() {
        const config = await this.get('ai');
        return { ...this.defaultConfig.ai, ...config };
    },

    async setAIConfig(aiConfig) {
        return await this.set('ai', { ...this.defaultConfig.ai, ...aiConfig });
    },

    async getClassificationConfig() {
        const config = await this.get('classification');
        return { ...this.defaultConfig.classification, ...config };
    },

    async setClassificationConfig(classificationConfig) {
        return await this.set('classification', { ...this.defaultConfig.classification, ...classificationConfig });
    },

    getProviderConfig(providerName) {
        return this.PROVIDERS[providerName] || null;
    },

    isAIConfigured() {
        return this.defaultConfig.ai && this.defaultConfig.ai.apiKey && this.defaultConfig.ai.endpoint;
    },

    validateAIConfig(aiConfig) {
        const errors = [];
        
        if (!aiConfig.apiKey || aiConfig.apiKey.trim() === '') {
            errors.push('API密钥不能为空');
        }
        
        if (!aiConfig.endpoint || aiConfig.endpoint.trim() === '') {
            errors.push('API端点不能为空');
        }
        
        try {
            new URL(aiConfig.endpoint);
        } catch {
            errors.push('API端点格式不正确');
        }
        
        if (!aiConfig.model || aiConfig.model.trim() === '') {
            errors.push('模型名称不能为空');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigManager;
}
