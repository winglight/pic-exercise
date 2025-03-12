import { R2Sync } from './r2-sync.js';

class ExerciseImageApp {
    constructor() {
        this.r2sync = new R2Sync();
        this.images = {};
        this.currentType = null;
        this.currentImages = [];
        this.currentImageIndex = -1;
        this.pastedImageFile = null; // 添加这一行
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadImages();
    }
    
    setupEventListeners() {
        // 设置按钮
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.r2sync.createConfigDialog(() => {
                this.loadImages(); // 配置更新后重新加载图片
            });
        });
        
        // 上传按钮
        document.getElementById('upload-btn').addEventListener('click', () => {
            this.showUploadDialog();
        });
        
        // 上传表单
        document.getElementById('upload-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleImageUpload();
        });
        
        // 取消上传
        document.getElementById('cancel-upload').addEventListener('click', () => {
            this.hideUploadDialog();
        });
        
        // 图片查看器控制
        document.getElementById('close-viewer').addEventListener('click', () => {
            this.hideImageViewer();
        });
        
        document.getElementById('prev-image').addEventListener('click', () => {
            this.showPrevImage();
        });
        
        document.getElementById('next-image').addEventListener('click', () => {
            this.showNextImage();
        });
        
        // 键盘导航
        document.addEventListener('keydown', (e) => {
            if (!document.getElementById('image-viewer').classList.contains('active')) return;
            
            if (e.key === 'Escape') {
                this.hideImageViewer();
            } else if (e.key === 'ArrowLeft') {
                this.showPrevImage();
            } else if (e.key === 'ArrowRight') {
                this.showNextImage();
            }
        });
        
        // 粘贴区域事件
        const pasteArea = document.getElementById('paste-area');
        const pastePreview = document.getElementById('paste-preview');
        
        // 点击粘贴区域时聚焦
        pasteArea.addEventListener('click', () => {
            pasteArea.focus();
        });
        
        // 监听粘贴事件 - 修改为同时支持 Mac 和 Windows
        document.addEventListener('paste', (e) => {
            // 只有当上传对话框打开时才处理粘贴事件
            if (!document.getElementById('upload-dialog').classList.contains('active')) return;
            
            const items = e.clipboardData.items;
            let imageFile = null;
            
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    imageFile = items[i].getAsFile();
                    break;
                }
            }
            
            if (imageFile) {
                // 清除文件输入框的值
                document.getElementById('image-file').value = '';
                
                // 显示预览
                const reader = new FileReader();
                reader.onload = (event) => {
                    pastePreview.src = event.target.result;
                    pastePreview.style.display = 'block';
                    document.querySelector('.paste-placeholder').style.display = 'none';
                };
                reader.readAsDataURL(imageFile);
                
                // 保存粘贴的图片文件
                this.pastedImageFile = imageFile;
            }
        });
        
        // 添加键盘事件监听，处理 Mac 上的 Command+V
        document.addEventListener('keydown', (e) => {
            // 检查是否是 Command+V (Mac) 或 Ctrl+V (Windows)
            const isPaste = (e.metaKey && e.key === 'v') || (e.ctrlKey && e.key === 'v');
            
            if (isPaste && document.getElementById('upload-dialog').classList.contains('active')) {
                // 聚焦到粘贴区域，让系统粘贴事件能够触发
                pasteArea.focus();
            }
        });
    }
    
    async loadImages() {
        const exerciseTypesEl = document.getElementById('exercise-types');
        exerciseTypesEl.innerHTML = '<li class="loading">加载中...</li>';
        
        try {
            this.images = await this.r2sync.getImageList();
            
            // 更新运动类型列表
            exerciseTypesEl.innerHTML = '';
            
            if (Object.keys(this.images).length === 0) {
                exerciseTypesEl.innerHTML = '<li class="loading">暂无图片</li>';
                return;
            }
            
            Object.keys(this.images).forEach(type => {
                const li = document.createElement('li');
                li.textContent = type;
                li.dataset.type = type;
                li.addEventListener('click', () => {
                    this.selectExerciseType(type);
                });
                exerciseTypesEl.appendChild(li);
            });
            
            // 默认选择第一个类型
            if (Object.keys(this.images).length > 0) {
                this.selectExerciseType(Object.keys(this.images)[0]);
            }
        } catch (error) {
            console.error('加载图片失败:', error);
            exerciseTypesEl.innerHTML = '<li class="loading">加载失败</li>';
        }
    }
    
    selectExerciseType(type) {
        // 更新选中状态
        const items = document.querySelectorAll('#exercise-types li');
        items.forEach(item => {
            if (item.dataset.type === type) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        this.currentType = type;
        this.currentImages = this.images[type] || [];
        
        // 更新标题
        document.getElementById('current-type').textContent = type;
        
        // 更新图片网格
        this.updateImageGrid();
    }
    
    updateImageGrid() {
        const gridEl = document.getElementById('image-grid');
        gridEl.innerHTML = '';
        
        if (this.currentImages.length === 0) {
            gridEl.innerHTML = '<div class="loading">该类型暂无图片</div>';
            return;
        }
        
        this.currentImages.forEach((image, index) => {
            const card = document.createElement('div');
            card.className = 'image-card';
            card.innerHTML = `
                <img src="${this.r2sync.getImageUrl(image.name)}" alt="${image.actionName}">
                <div class="image-info">
                    <h3>${image.actionName}</h3>
                </div>
            `;
            
            card.addEventListener('click', () => {
                this.showImageViewer(index);
            });
            
            gridEl.appendChild(card);
        });
    }
    
    showImageViewer(index) {
        if (index < 0 || index >= this.currentImages.length) return;
        
        this.currentImageIndex = index;
        const image = this.currentImages[index];
        
        const viewerEl = document.getElementById('image-viewer');
        const imageEl = document.getElementById('viewer-image');
        const titleEl = document.getElementById('viewer-title');
        
        imageEl.src = this.r2sync.getImageUrl(image.name);
        titleEl.textContent = `${this.currentType} - ${image.actionName}`;
        
        viewerEl.classList.add('active');
    }
    
    hideImageViewer() {
        document.getElementById('image-viewer').classList.remove('active');
    }
    
    showPrevImage() {
        let index = this.currentImageIndex - 1;
        if (index < 0) index = this.currentImages.length - 1;
        this.showImageViewer(index);
    }
    
    showNextImage() {
        let index = this.currentImageIndex + 1;
        if (index >= this.currentImages.length) index = 0;
        this.showImageViewer(index);
    }
    
    showUploadDialog() {
        const dialog = document.getElementById('upload-dialog');
        dialog.classList.add('active');
        
        // 填充运动类型下拉列表
        const datalist = document.getElementById('exercise-type-list');
        datalist.innerHTML = '';
        
        Object.keys(this.images).forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            datalist.appendChild(option);
        });
        
        // 如果当前有选中的类型，预填充
        if (this.currentType) {
            document.getElementById('exercise-type').value = this.currentType;
        }
    }
    
    hideUploadDialog() {
        document.getElementById('upload-dialog').classList.remove('active');
        document.getElementById('upload-form').reset();
        // 重置粘贴预览
        document.getElementById('paste-preview').style.display = 'none';
        document.querySelector('.paste-placeholder').style.display = 'block';
        this.pastedImageFile = null;
    }
    
    async handleImageUpload() {
        const exerciseType = document.getElementById('exercise-type').value.trim();
        const actionName = document.getElementById('action-name').value.trim();
        const fileInput = document.getElementById('image-file');
        
        if (!exerciseType || !actionName) {
            alert('请填写运动类型和动作名称');
            return;
        }
        
        // 检查是否有文件或粘贴的图片
        let file = null;
        if (fileInput.files.length > 0) {
            file = fileInput.files[0];
        } else if (this.pastedImageFile) {
            file = this.pastedImageFile;
        } else {
            alert('请选择或粘贴一张图片');
            return;
        }
        
        try {
            const result = await this.r2sync.uploadImage(file, exerciseType, actionName);
            if (result.success) {
                this.hideUploadDialog();
                await this.loadImages();
                
                // 如果上传的图片类型与当前显示的类型相同，则刷新显示
                if (this.currentType === exerciseType) {
                    this.selectExerciseType(exerciseType);
                }
                
                alert('上传成功！');
            }
        } catch (error) {
            console.error('上传失败:', error);
            alert(`上传失败: ${error.message}`);
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new ExerciseImageApp();
});