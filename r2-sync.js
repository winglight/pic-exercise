// r2-sync.js

export class R2Sync {
    constructor() {
        this.config = {
            app: '',
            url: '',
            token: '',
            enabled: false,
            publicDomain: '' // 添加公开域名字段
        };
        this.loadConfig();
    }

    // 加载配置
    loadConfig() {
        const stored = localStorage.getItem('r2Config');
        if (stored) {
            this.config = JSON.parse(stored);
        }
    }

    // 保存配置
    saveConfig() {
        localStorage.setItem('r2Config', JSON.stringify(this.config));
    }

    // 更新配置
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.saveConfig();
    }

    // 同步数据到R2
    async syncToR2(data, entity = 'todos') {
        if (!this.config.enabled) return;
        
        // Create a zip file
        const zip = new JSZip();
        
        // Add files to zip
        const jsonString = JSON.stringify(data);
        zip.file(entity, jsonString);
        
        // Generate zip content
        const zipContent = await zip.generateAsync({type: "blob"});
        
        try {
            await fetch(`${this.config.url}/${this.config.app}/${entity}.zip`, {
                method: 'PUT',
                headers: {
                    'X-Custom-Auth-Key': `${this.config.token}`
                },
                body: zipContent
            });
        } catch (error) {
            console.error('Upload failed:', error);
        }
    }

    // 从R2加载数据
    async loadFromR2(entity = 'todos') {
        if (!this.config.enabled) return null;
        
        try {
            const response = await fetch(`${this.config.url}/${this.config.app}/${entity}.zip`, {
                headers: {
                    'X-Custom-Auth-Key': `${this.config.token}`
                }
            });
            
            if (!response.ok) return null;
            
            // Get zip file blob
            const zipBlob = await response.blob();
            
            // Load and parse zip
            const zip = new JSZip();
            const contents = await zip.loadAsync(zipBlob);
            
            // Extract files
            const files = [];
            for (let filename in contents.files) {
                const content = await contents.files[filename].async("string");
                files.push({
                    name: filename,
                    content: content
                });
            }
            
            return JSON.parse(files[0].content);
        } catch (error) {
            console.error('Download failed:', error);
            return null;
        }
    }

    // 创建配置对话框
    createConfigDialog(onSave) {
        const configDialog = document.createElement("div");
        configDialog.className = "config-dialog";
        configDialog.innerHTML = `
            <h2>R2 Config</h2>
            <label>
                Enable R2 sync
                <input type="checkbox" id="r2-enabled" ${this.config.enabled ? 'checked' : ''}>
            </label>
            <label>
                App
                <input type="text" id="app" value="${this.config.app}">
            </label>
            <label>
                URL
                <input type="text" id="url" value="${this.config.url}">
            </label>
            <label>
                Token
                <input type="text" id="token" value="${this.config.token}">
            </label>
            <label>
                公开域名
                <input type="text" id="public-domain" value="${this.config.publicDomain}" placeholder="例如: r2.broyustudio.com">
            </label>
            <button id="save-config">Save</button>
            <button id="close-config">Close</button>
        `;

        document.body.appendChild(configDialog);

        document.getElementById("save-config").addEventListener("click", () => {
            const newConfig = {
                enabled: document.getElementById("r2-enabled").checked,
                app: document.getElementById("app").value,
                url: document.getElementById("url").value,
                token: document.getElementById("token").value,
                publicDomain: document.getElementById("public-domain").value.trim()
            };
            this.updateConfig(newConfig);
            if (onSave) onSave();
            configDialog.remove();
        });

        document.getElementById("close-config").addEventListener("click", () => {
            configDialog.remove();
        });
    }
    
    // 上传图片到R2
    async uploadImage(file, exerciseType, actionName) {
        if (!this.config.enabled) return null;
        
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            throw new Error('只能上传图片文件');
        }
        
        // 获取文件扩展名
        let extension;
        if (file.name) {
            extension = file.name.split('.').pop().toLowerCase();
        } else {
            // 处理粘贴的图片，根据MIME类型确定扩展名
            extension = file.type.split('/')[1];
            if (extension === 'jpeg') extension = 'jpg';
        }
        
        if (!['jpg', 'jpeg', 'png'].includes(extension)) {
            throw new Error('只支持JPG和PNG格式');
        }
        
        // 构建文件名，加入 app 名称作为目录前缀
        const filename = `${this.config.app}/${exerciseType}-${actionName}.${extension}`;
        
        try {
            const response = await fetch(`${this.config.url}/${filename}`, {
                method: 'PUT',
                headers: {
                    'X-Custom-Auth-Key': this.config.token,
                    'Content-Type': file.type
                },
                body: file
            });
            
            if (!response.ok) {
                throw new Error(`上传失败: ${response.status} ${response.statusText}`);
            }
            
            return {
                success: true,
                filename: filename
            };
        } catch (error) {
            console.error('上传图片失败:', error);
            throw error;
        }
    }
    
    // 获取所有图片列表
    async getImageList() {
        if (!this.config.enabled) return [];
        
        try {
            // 修改 URL 路径，加入 app 名称作为目录前缀
            const response = await fetch(`${this.config.url}/list/${this.config.app}`, {
                headers: {
                    'X-Custom-Auth-Key': this.config.token
                }
            });
            
            if (!response.ok) {
                throw new Error(`获取图片列表失败: ${response.status} ${response.statusText}`);
            }
            
            const images = await response.json();
            
            // 按运动类型分组
            const groupedImages = {};
            images.forEach(image => {
                // 解析文件名格式: <运动类型>-<动作名称>.jpg|png
                const match = image.name.match(/^([^-]+)-(.+)\.(jpg|jpeg|png)$/i);
                if (match) {
                    const exerciseType = match[1];
                    if (!groupedImages[exerciseType]) {
                        groupedImages[exerciseType] = [];
                    }
                    groupedImages[exerciseType].push({
                        ...image,
                        exerciseType: exerciseType,
                        actionName: match[2],
                        extension: match[3]
                    });
                }
            });
            
            return groupedImages;
        } catch (error) {
            console.error('获取图片列表失败:', error);
            return {};
        }
    }
    
    // 获取图片URL
    getImageUrl(imageName) {
        // 确保 imageName 包含 app 名称作为目录前缀
        if (!imageName.startsWith(this.config.app + '/')) {
            imageName = `${this.config.app}/${imageName}`;
        }
        
        // 如果设置了公开域名，则使用公开域名
        if (this.config.publicDomain && this.config.publicDomain.trim() !== '') {
            // 确保域名格式正确
            let domain = this.config.publicDomain.trim();
            if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
                domain = 'https://' + domain;
            }
            
            // 移除末尾的斜杠
            if (domain.endsWith('/')) {
                domain = domain.slice(0, -1);
            }
            
            return `${domain}/${imageName}`;
        }
        
        // 否则使用原始 URL
        return `${this.config.url}/${imageName}`;
    }
}