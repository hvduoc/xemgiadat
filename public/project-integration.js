// PROJECT MAP INTEGRATION SYSTEM
// Advanced layer management for project subdivision maps

class ProjectMapIntegration {
    constructor(map) {
        this.map = map;
        this.layers = new Map();
        this.activeProjects = new Set();
        this.performanceMode = 'auto'; // auto, fast, quality
        
        this.initializeUI();
        this.setupPerformanceOptimization();
    }
    
    // Initialize layer control UI
    initializeUI() {
        const layerControl = L.control.layers(null, null, {
            position: 'topright',
            collapsed: false
        });
        
        // Add to toolbar
        this.addProjectLayerButton();
        
        layerControl.addTo(this.map);
        this.layerControl = layerControl;
    }
    
    // Add project layer toggle button to existing toolbar
    addProjectLayerButton() {
        const projectBtn = document.createElement('button');
        projectBtn.className = 'toolbar-btn-compact project-layer-btn';
        projectBtn.innerHTML = `
            <i class="fas fa-layer-group"></i>
            <span>Dự án</span>
        `;
        
        projectBtn.addEventListener('click', () => {
            this.toggleProjectLayerPanel();
        });
        
        // Add to existing toolbar
        const toolbar = document.getElementById('action-toolbar');
        if (toolbar) {
            toolbar.appendChild(projectBtn);
        }
    }
    
    // Project layer management panel
    toggleProjectLayerPanel() {
        const panelId = 'project-layer-panel';
        let panel = document.getElementById(panelId);
        
        if (!panel) {
            panel = this.createProjectPanel();
        }
        
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
    
    createProjectPanel() {
        const panel = document.createElement('div');
        panel.id = 'project-layer-panel';
        panel.className = 'project-layer-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <h3>Bản đồ phân lô dự án</h3>
                <button class="close-btn" onclick="this.parentElement.parentElement.style.display='none'">×</button>
            </div>
            <div class="panel-content">
                <div class="layer-group">
                    <h4>Dữ liệu chính thức</h4>
                    <label><input type="radio" name="base-layer" value="tnmt" checked> Sở TNMT</label>
                </div>
                
                <div class="layer-group">
                    <h4>Dự án phát triển</h4>
                    <div id="project-list">
                        <!-- Dynamic project list -->
                    </div>
                    <button class="add-project-btn" onclick="projectIntegration.addNewProject()">
                        + Thêm dự án
                    </button>
                </div>
                
                <div class="layer-group">
                    <h4>Hiển thị</h4>
                    <label><input type="checkbox" id="overlay-mode"> Chế độ overlay</label>
                    <label><input type="range" id="opacity-slider" min="0" max="100" value="70"> Độ trong suốt</label>
                </div>
                
                <div class="layer-group">
                    <h4>Hiệu suất</h4>
                    <select id="performance-mode">
                        <option value="auto">Tự động</option>
                        <option value="fast">Nhanh (ít chi tiết)</option>
                        <option value="quality">Chất lượng cao</option>
                    </select>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        return panel;
    }
    
    // Add new project layer
    async addNewProject() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.dwg,.dxf,.jpg,.png,.pdf';
        fileInput.multiple = true;
        
        fileInput.onchange = async (event) => {
            const files = Array.from(event.target.files);
            
            for (const file of files) {
                await this.processProjectFile(file);
            }
        };
        
        fileInput.click();
    }
    
    // Process uploaded project files
    async processProjectFile(file) {
        const fileType = file.name.split('.').pop().toLowerCase();
        
        try {
            switch (fileType) {
                case 'dwg':
                case 'dxf':
                    await this.processDWGFile(file);
                    break;
                case 'jpg':
                case 'png':
                    await this.processImageFile(file);
                    break;
                case 'pdf':
                    await this.processPDFFile(file);
                    break;
                default:
                    throw new Error('Unsupported file type');
            }
        } catch (error) {
            console.error('Error processing file:', error);
            alert(`Lỗi xử lý file ${file.name}: ${error.message}`);
        }
    }
    
    // DWG/DXF processing
    async processDWGFile(file) {
        // Show progress indicator
        this.showProgress('Đang xử lý file CAD...');
        
        // Convert to base64 for upload
        const fileData = await this.fileToBase64(file);
        
        // Send to backend for processing
        const response = await fetch('/api/process-dwg', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: file.name,
                data: fileData
            })
        });
        
        if (response.ok) {
            const geoJSON = await response.json();
            this.addGeoJSONLayer(geoJSON, file.name);
        }
        
        this.hideProgress();
    }
    
    // Image file processing  
    async processImageFile(file) {
        const imageUrl = URL.createObjectURL(file);
        
        // Show geo-referencing dialog
        this.showGeoReferenceDialog(imageUrl, file.name);
    }
    
    // Geo-referencing dialog for images
    showGeoReferenceDialog(imageUrl, filename) {
        const dialog = document.createElement('div');
        dialog.className = 'georeference-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>Định vị bản đồ: ${filename}</h3>
                <div class="image-preview">
                    <img src="${imageUrl}" alt="Project Map" style="max-width: 400px;">
                </div>
                <div class="coordinates-input">
                    <h4>Tọa độ góc (WGS84):</h4>
                    <div class="coord-row">
                        <label>Góc trên trái:</label>
                        <input type="number" id="tl-lat" placeholder="Vĩ độ" step="0.000001">
                        <input type="number" id="tl-lng" placeholder="Kinh độ" step="0.000001">
                    </div>
                    <div class="coord-row">
                        <label>Góc dưới phải:</label>
                        <input type="number" id="br-lat" placeholder="Vĩ độ" step="0.000001">
                        <input type="number" id="br-lng" placeholder="Kinh độ" step="0.000001">
                    </div>
                </div>
                <div class="dialog-buttons">
                    <button onclick="this.closest('.georeference-dialog').remove()">Hủy</button>
                    <button onclick="projectIntegration.applyGeoReference('${imageUrl}', '${filename}')">Áp dụng</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
    }
    
    // Apply geo-referencing and add image overlay
    applyGeoReference(imageUrl, filename) {
        const tlLat = parseFloat(document.getElementById('tl-lat').value);
        const tlLng = parseFloat(document.getElementById('tl-lng').value);
        const brLat = parseFloat(document.getElementById('br-lat').value);
        const brLng = parseFloat(document.getElementById('br-lng').value);
        
        if (isNaN(tlLat) || isNaN(tlLng) || isNaN(brLat) || isNaN(brLng)) {
            alert('Vui lòng nhập đầy đủ tọa độ');
            return;
        }
        
        const bounds = [[tlLat, tlLng], [brLat, brLng]];
        
        const imageOverlay = L.imageOverlay(imageUrl, bounds, {
            opacity: 0.7,
            className: 'project-image-overlay'
        });
        
        this.addLayerToControl(imageOverlay, filename, 'project');
        
        // Close dialog
        document.querySelector('.georeference-dialog').remove();
        
        // Fit map to new layer
        this.map.fitBounds(bounds);
    }
    
    // Add layer to layer control
    addLayerToControl(layer, name, type) {
        this.layers.set(name, {
            layer: layer,
            type: type,
            visible: true
        });
        
        this.layerControl.addOverlay(layer, `${name} (${type})`);
        layer.addTo(this.map);
        
        // Update project list
        this.updateProjectList();
    }
    
    // Performance optimization
    setupPerformanceOptimization() {
        // Monitor FPS
        let lastTime = 0;
        let frames = 0;
        
        const checkPerformance = (currentTime) => {
            frames++;
            
            if (currentTime - lastTime >= 1000) {
                const fps = frames;
                frames = 0;
                lastTime = currentTime;
                
                // Adjust quality based on FPS
                if (fps < 30 && this.performanceMode === 'auto') {
                    this.optimizeForPerformance();
                }
            }
            
            requestAnimationFrame(checkPerformance);
        };
        
        requestAnimationFrame(checkPerformance);
        
        // Memory cleanup on zoom out
        this.map.on('zoomend', () => {
            if (this.map.getZoom() < 15) {
                this.cleanupDetailedLayers();
            }
        });
    }
    
    // Optimize for performance
    optimizeForPerformance() {
        // Reduce layer opacity
        this.layers.forEach(({layer}) => {
            if (layer.setOpacity) {
                layer.setOpacity(0.5);
            }
        });
        
        // Simplify geometries
        // Disable some visual effects
        console.log('Performance optimization activated');
    }
    
    // Utility functions
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    }
    
    showProgress(message) {
        // Implementation for progress indicator
        console.log(message);
    }
    
    hideProgress() {
        // Implementation to hide progress
    }
    
    updateProjectList() {
        // Update the project list in the panel
        const projectList = document.getElementById('project-list');
        if (projectList) {
            projectList.innerHTML = '';
            
            this.layers.forEach((layerInfo, name) => {
                if (layerInfo.type === 'project') {
                    const item = document.createElement('div');
                    item.innerHTML = `
                        <label>
                            <input type="checkbox" checked onchange="projectIntegration.toggleLayer('${name}')">
                            ${name}
                        </label>
                        <button onclick="projectIntegration.removeLayer('${name}')" class="remove-btn">×</button>
                    `;
                    projectList.appendChild(item);
                }
            });
        }
    }
    
    toggleLayer(name) {
        const layerInfo = this.layers.get(name);
        if (layerInfo) {
            if (layerInfo.visible) {
                this.map.removeLayer(layerInfo.layer);
                layerInfo.visible = false;
            } else {
                this.map.addLayer(layerInfo.layer);
                layerInfo.visible = true;
            }
        }
    }
    
    removeLayer(name) {
        const layerInfo = this.layers.get(name);
        if (layerInfo) {
            this.map.removeLayer(layerInfo.layer);
            this.layerControl.removeLayer(layerInfo.layer);
            this.layers.delete(name);
            this.updateProjectList();
        }
    }
}

// Initialize when map is ready
let projectIntegration;

// Wait for map to be initialized
const initProjectIntegration = () => {
    if (typeof map !== 'undefined' && map) {
        projectIntegration = new ProjectMapIntegration(map);
        console.log('Project Map Integration initialized');
    } else {
        setTimeout(initProjectIntegration, 1000);
    }
};

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProjectIntegration);
} else {
    initProjectIntegration();
}