const fs = require('fs');
const https = require('https');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'test_config.json');

const DEFAULT_CONFIG = {
    apiKey: '',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4-flash',
    temperature: 0.3,
    maxTokens: 2000,
    sampleCount: 20,
    thinking: { type: 'disabled' },
    stream: false
};

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const configData = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
            console.log('✅ 从 test_config.json 加载配置');
            return { ...DEFAULT_CONFIG, ...configData };
        }
    } catch (error) {
        console.warn('⚠️ 读取配置文件失败，使用默认配置:', error.message);
    }
    
    console.log('ℹ️ 使用默认配置');
    return DEFAULT_CONFIG;
}

const CONFIG = loadConfig();
let bookmarks = [];

function loadBookmarks() {
    try {
        const data = JSON.parse(fs.readFileSync('./tempChrome', 'utf-8'));
        bookmarks = [];
        traverse(data);
        console.log(`✅ 成功加载 ${bookmarks.length} 个书签`);
        return true;
    } catch (error) {
        console.error('❌ 加载书签失败:', error.message);
        return false;
    }
}

function traverse(nodes) {
    for (const node of nodes) {
        if (node.url) {
            bookmarks.push({
                id: node.id,
                title: node.title,
                url: node.url
            });
        }
        if (node.children) {
            traverse(node.children);
        }
    }
}

function buildPrompt(sampleBookmarks) {
    const bookmarkList = sampleBookmarks.map((b, i) => 
        `${i + 1}. ${b.title}\n   URL: ${b.url}`
    ).join('\n\n');

    const systemPrompt = `你是一个专业的书签分类助手。你的任务是帮助用户整理和分类书签。

规则：
1. 分类名称必须简洁，2-6个中文字符或2-10个英文字符
2. 分类名称不能包含URL、特殊字符或数字开头
3. 优先使用已有的分类名称
4. 如果需要创建新分类，确保分类名称具有通用性和可理解性
5. 返回的JSON格式必须严格符合要求
6. 不要添加任何解释性文字，只返回JSON

你需要为用户的书签生成分类名称列表。`;

    const userPrompt = `请分析以下书签并生成不超过10个分类名称。

书签列表：
${bookmarkList}

要求：
1. 分类数量不超过10个
2. 每个分类名称2-6个中文字符
3. 分类应覆盖所有书签类型
4. 分类名称要通用、易懂

请返回JSON数组格式：
["分类1", "分类2", "分类3", ...]`;

    return { systemPrompt, userPrompt };
}

function request(options, bodyString) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                resolve({ res, responseData });
            });
        });
        
        req.on('error', reject);
        req.setTimeout(120000, () => {
            req.destroy(new Error('请求超时'));
        });
        
        req.write(bodyString);
        req.end();
    });
}

function extractFinalJSON(content) {
    if (!content) return null;
    
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch (e) {}
    }
    return null;
}

async function callGLM() {
    const sampleBookmarks = bookmarks.slice(0, CONFIG.sampleCount);
    const { systemPrompt, userPrompt } = buildPrompt(sampleBookmarks);
    
    const requestBody = {
        model: CONFIG.model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: CONFIG.temperature,
        max_tokens: CONFIG.maxTokens,
        thinking: CONFIG.thinking,
        response_format: { type: 'json_object' }
    };
    
    console.log(CONFIG.thinking.type === 'enabled' ? '   💡 已启用深度思考模式' : '   💡 已禁用深度思考模式');
    
    const bodyString = JSON.stringify(requestBody);
    const sizeKB = (Buffer.byteLength(bodyString) / 1024).toFixed(2);
    
    console.log('\n📤 请求信息：');
    console.log(`   模型: ${CONFIG.model}`);
    console.log(`   样本书签: ${sampleBookmarks.length}`);
    console.log(`   请求大小: ${Buffer.byteLength(bodyString)} 字节 (约 ${sizeKB} KB)`);
    console.log(`   请求体:`, JSON.stringify(requestBody, null, 2));
    const url = new URL(CONFIG.endpoint);
    const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.apiKey}`,
            'Content-Length': Buffer.byteLength(bodyString)
        }
    };
    
    const startTime = Date.now();
    
    try {
        const { res, responseData } = await request(options, bodyString);
        const endTime = Date.now();
        
        console.log(`\n📥 响应信息：`);
        console.log(`   响应时间: ${endTime - startTime}ms`);
        console.log(`   状态码: ${res.statusCode} ${res.statusMessage}`);
        
        if (res.statusCode === 200) {
            const data = JSON.parse(responseData);
            const choice = data.choices[0];
            const finishReason = choice.finish_reason;
            
            console.log(`   Model: ${data.model}`);
            console.log(`   Finish Reason: ${finishReason}`);
            console.log(`   Usage:`, JSON.stringify(data.usage, null, 2));
            
            if (finishReason === 'length') {
                console.error('\n❌ 输出被截断 (finish_reason: length)');
                console.error('💡 建议增加 maxTokens 配置值');
                throw new Error('输出被截断，请增加 maxTokens');
            } else if (finishReason === 'sensitive') {
                console.error('\n❌ 内容被安全审核拦截 (finish_reason: sensitive)');
                throw new Error('内容被安全审核拦截');
            } else if (finishReason === 'network_error') {
                console.error('\n❌ 模型推理异常 (finish_reason: network_error)');
                throw new Error('模型推理异常');
            } else if (finishReason === 'model_context_window_exceeded') {
                console.error('\n❌ 超出模型上下文窗口 (finish_reason: model_context_window_exceeded)');
                console.error('💡 建议减少样本书签数量');
                throw new Error('超出模型上下文窗口');
            }
            
            const message = choice.message;
            const content = message.content;
            const reasoningContent = message.reasoning_content;
            
            console.log('\n🎯 分类结果：');
            console.log(content || '(content为空)');
            
            if (reasoningContent && CONFIG.thinking?.type === 'enabled') {
                console.log('\n🧠 思考过程：');
                console.log(reasoningContent);
            }
            
            const categories = extractFinalJSON(content);
            
            if (categories) {
                console.log('\n✅ 解析后的分类：');
                console.log(JSON.stringify(categories, null, 2));
                
                fs.writeFileSync('./classification_result.json', JSON.stringify(categories, null, 2), 'utf-8');
                console.log('\n💾 结果已保存到 classification_result.json');
                
                return categories;
            } else {
                console.log('\n⚠️ 未找到JSON数组格式');
                throw new Error('无法从响应中提取JSON');
            }
        } else if (res.statusCode === 429) {
            console.error(`   ❌ 速率限制 (429):`, responseData);
            console.error('   💡 已达到API速率限制，请稍后再试');
            throw new Error('API速率限制，请稍后再试');
        } else {
            console.error(`   ❌ API错误:`, responseData);
            throw new Error(`API返回错误 ${res.statusCode}`);
        }
    } catch (error) {
        console.error(`   ❌ 失败:`, error.message);
        throw error;
    }
}

function validateConfig() {
    if (!CONFIG.apiKey || CONFIG.apiKey.trim() === '') {
        console.error('❌ API Key 未配置');
        console.log('💡 请检查 test_config.json 文件');
        return false;
    }
    
    if (!bookmarks || bookmarks.length === 0) {
        console.error('❌ 没有可用的书签数据');
        return false;
    }
    
    return true;
}

async function main() {
    console.log('='.repeat(60));
    console.log('📚 书签分类测试工具');
    console.log('='.repeat(60));
    
    if (!loadBookmarks()) {
        process.exit(1);
    }
    
    if (!validateConfig()) {
        process.exit(1);
    }
    
    try {
        await callGLM();
        console.log('\n' + '='.repeat(60));
        console.log('✅ 测试完成');
        console.log('='.repeat(60));
    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        if (error.message.includes('速率限制')) {
            console.error('💡 提示：');
            console.error('   - 您已达到API速率限制');
            console.error('   - 请等待一段时间后再试');
            console.error('   - 不要频繁重复调用');
        } else if (error.message.includes('被截断')) {
            console.error('💡 建议：');
            console.error('   - 在 test_config.json 中增加 maxTokens 值');
            console.error('   - 当前值: ' + CONFIG.maxTokens);
        } else if (error.message.includes('上下文窗口')) {
            console.error('💡 建议：');
            console.error('   - 在 test_config.json 中减少 sampleCount 值');
            console.error('   - 当前值: ' + CONFIG.sampleCount);
        } else if (error.message.includes('安全审核')) {
            console.error('💡 提示：');
            console.error('   - 内容被安全审核拦截');
            console.error('   - 请检查输入内容是否合规');
        } else if (error.message.includes('推理异常')) {
            console.error('💡 建议：');
            console.error('   - 模型推理异常，请稍后重试');
            console.error('   - 或检查网络连接');
        } else {
            console.error('💡 建议检查：');
            console.error('   - API Key 是否正确');
            console.error('   - 网络连接是否正常');
            console.error('   - 智谱API服务是否可用');
        }
        process.exit(1);
    }
}

main();
