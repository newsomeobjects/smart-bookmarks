const AIClassifier = {
    BATCH_SIZE: 30,
    
    async chat(messages, aiConfig) {
        if (!aiConfig || !aiConfig.apiKey || !aiConfig.endpoint) {
            throw new Error('AI配置不完整，请先配置API密钥和端点');
        }

        const requestBody = {
            model: aiConfig.model || 'deepseek-chat',
            messages: messages,
            temperature: aiConfig.temperature || 0.3,
            max_tokens: aiConfig.maxTokens || 4000,
            response_format: { type: 'json_object' }
        };

        try {
            const response = await fetch(aiConfig.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${aiConfig.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API请求失败: ${response.status} - ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.choices || data.choices.length === 0) {
                throw new Error('API返回数据格式错误');
            }
            
            const finishReason = data.choices[0].finish_reason;
            if (finishReason === 'length') {
                throw new Error('输出被截断，请增加maxTokens配置');
            }
            
            return data.choices[0].message.content;
        } catch (error) {
            console.error('[AIClassifier] API调用失败:', error);
            throw error;
        }
    },

    parseJSONResponse(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return JSON.parse(response);
        } catch (error) {
            console.error('[AIClassifier] JSON解析失败:', error);
            console.error('[AIClassifier] 原始响应:', response);
            throw new Error('AI返回的数据格式不正确');
        }
    },

    getDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return '';
        }
    },

    generateBookmarkSummaries(bookmarks) {
        return bookmarks.map((b, i) => {
            const domain = this.getDomain(b.url);
            return `${i + 1}. ${b.title}${domain ? ' - ' + domain : ''}`;
        }).join('\n');
    },

    async generateCategoryTree(bookmarks, maxDepth, maxCategories, aiConfig) {
        const bookmarkSummaries = this.generateBookmarkSummaries(bookmarks);
        
        const prompt = PromptManager.render('classification/generate-tree', {
            bookmarkSummaries,
            maxDepth,
            maxCategories
        });
        
        const systemPrompt = PromptManager.get('system');

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
        ];

        const response = await this.chat(messages, aiConfig);
        const result = this.parseJSONResponse(response);
        
        if (!result.categories || !Array.isArray(result.categories)) {
            throw new Error('AI返回的分类目录格式错误');
        }
        
        return result;
    },

    validateClassificationResult(result, bookmarks, validPaths) {
        const errors = [];
        
        if (!result.assignments || !Array.isArray(result.assignments)) {
            errors.push('缺少assignments数组');
            return { valid: false, errors };
        }
        
        if (result.assignments.length !== bookmarks.length) {
            errors.push(`归类数量不匹配: 期望${bookmarks.length}个，实际${result.assignments.length}个`);
        }
        
        const bookmarkIds = new Set(bookmarks.map(b => b.id));
        const assignedIds = new Set();
        
        for (const assignment of result.assignments) {
            if (!assignment.id) {
                errors.push(`第${assignment.index}个结果缺少书签ID`);
            } else {
                if (!bookmarkIds.has(assignment.id)) {
                    errors.push(`无效的书签ID: ${assignment.id}`);
                }
                assignedIds.add(assignment.id);
            }
            
            if (!assignment.path) {
                errors.push(`书签${assignment.id}缺少分类路径`);
            } else if (assignment.path !== '未分类' && !validPaths.has(assignment.path)) {
                errors.push(`无效的分类路径: ${assignment.path}`);
            }
            
            if (!assignment.reason || assignment.reason.trim().length === 0) {
                errors.push(`书签${assignment.id}缺少归类理由`);
            }
        }
        
        const missingIds = [...bookmarkIds].filter(id => !assignedIds.has(id));
        if (missingIds.length > 0) {
            errors.push(`未归类的书签ID: ${missingIds.join(', ')}`);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            stats: {
                total: bookmarks.length,
                classified: assignedIds.size,
                withReasons: result.assignments.filter(a => a.reason).length
            }
        };
    },

    async classifyBookmarksByTree(bookmarks, categoryTree, aiConfig) {
        const categoryJson = JSON.stringify(categoryTree, null, 2);
        
        const bookmarkList = bookmarks.map((b, i) => 
            `ID: ${b.id} | ${i + 1}. ${b.title}\n   URL: ${b.url}`
        ).join('\n\n');

        const prompt = PromptManager.render('classification/classify-by-tree', {
            categoryTree: categoryJson,
            bookmarkList
        });
        
        const systemPrompt = PromptManager.get('system');

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
        ];

        const response = await this.chat(messages, aiConfig);
        const result = this.parseJSONResponse(response);
        
        const validPaths = new Set(this.flattenCategoryTree(categoryTree));
        validPaths.add('未分类');
        
        const validation = this.validateClassificationResult(result, bookmarks, validPaths);
        
        if (!validation.valid) {
            console.warn('[AIClassifier] 分类结果校验警告:', validation.errors);
        }
        
        return {
            assignments: result.assignments || [],
            validation: validation,
            aiValidation: result.validation || null
        };
    },

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
    },

    buildClassificationResult(bookmarks, assignments, categoryTree) {
        const classification = {};
        
        const allPaths = this.flattenCategoryTree(categoryTree);
        allPaths.forEach(path => {
            classification[path] = [];
        });
        classification['未分类'] = [];
        
        for (const assignment of assignments) {
            const bookmark = bookmarks.find(b => b.id === assignment.id);
            
            if (!bookmark) {
                console.warn(`[AIClassifier] 找不到书签ID: ${assignment.id}`);
                continue;
            }
            
            const path = assignment.path || '未分类';
            
            if (!classification[path]) {
                classification[path] = [];
            }
            
            classification[path].push({
                ...bookmark,
                reason: assignment.reason
            });
        }
        
        return classification;
    },

    async classifySingle(bookmark, existingFolders, aiConfig) {
        const systemPrompt = PromptManager.get('system');
        const folderList = existingFolders.map(f => f.title).join(', ');
        
        const userPrompt = PromptManager.render('single/classify-single', {
            existingFolders: folderList,
            title: bookmark.title,
            url: bookmark.url
        });

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        try {
            const response = await this.chat(messages, aiConfig);
            const result = this.parseJSONResponse(response);
            
            return {
                bookmarkId: bookmark.id,
                bookmarkTitle: bookmark.title,
                bookmarkUrl: bookmark.url,
                category: result.category || '未分类',
                confidence: result.confidence || 0.5,
                isNewCategory: result.isNewCategory || false
            };
        } catch (error) {
            console.error('[AIClassifier] 单书签分类失败:', error);
            throw error;
        }
    },

    async batchClassifyWithTree(bookmarks, progressCallback) {
        const aiConfig = await ConfigManager.getAIConfig();
        const classificationConfig = await ConfigManager.getClassificationConfig();
        
        const maxDepth = classificationConfig.maxDepth || 2;
        const maxCategories = classificationConfig.maxFolders || 10;
        const batchSize = classificationConfig.batchSize || 30;
        
        if (progressCallback) {
            progressCallback({ stage: 'tree', status: '正在生成分类目录...', progress: 10 });
        }
        
        const treeResult = await this.generateCategoryTree(bookmarks, maxDepth, maxCategories, aiConfig);
        const categoryTree = treeResult.categories;
        const userProfile = treeResult.userProfile;
        
        const treeWithUnclassified = [
            ...categoryTree,
            { name: '未分类', children: [] }
        ];
        
        if (progressCallback) {
            progressCallback({ stage: 'classifying', status: '正在分类书签...', progress: 30 });
        }
        
        const allAssignments = [];
        const validationResults = [];
        const batches = Math.ceil(bookmarks.length / batchSize);
        
        for (let i = 0; i < batches; i++) {
            const start = i * batchSize;
            const end = Math.min(start + batchSize, bookmarks.length);
            const batch = bookmarks.slice(start, end);
            
            const result = await this.classifyBookmarksByTree(batch, treeWithUnclassified, aiConfig);
            
            allAssignments.push(...result.assignments);
            validationResults.push({
                batch: i + 1,
                ...result.validation
            });
            
            if (progressCallback) {
                const progress = 30 + (60 * (i + 1) / batches);
                progressCallback({ 
                    stage: 'classifying', 
                    status: `正在分类书签 (${end}/${bookmarks.length})...`, 
                    progress: Math.round(progress)
                });
            }
        }
        
        const classification = this.buildClassificationResult(bookmarks, allAssignments, categoryTree);
        
        const overallValidation = {
            valid: validationResults.every(v => v.valid),
            totalBatches: batches,
            validBatches: validationResults.filter(v => v.valid).length,
            totalErrors: validationResults.reduce((sum, v) => sum + v.errors.length, 0),
            details: validationResults
        };
        
        if (progressCallback) {
            progressCallback({ stage: 'complete', status: '分类完成', progress: 100 });
        }
        
        return {
            categoryTree,
            classification,
            userProfile,
            assignments: allAssignments,
            validation: overallValidation,
            timestamp: Date.now(),
            bookmarkCount: bookmarks.length
        };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIClassifier;
}
