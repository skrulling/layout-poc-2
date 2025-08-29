class Component {
    constructor(id, type, defaultWidth, defaultHeight) {
        this.id = id;
        this.type = type;
        this.position = { col: 0, row: 0, width: defaultWidth, height: defaultHeight };
        this.element = this.createElement();
    }
    
    updateElement(canvas) {
        const cellSize = this.getCellSize(canvas);
        const x = this.position.col * cellSize.width + (this.position.col * 2);
        const y = this.position.row * cellSize.height + (this.position.row * 2);
        const width = this.position.width * cellSize.width + (this.position.width - 1) * 2;
        const height = this.position.height * cellSize.height + (this.position.height - 1) * 2;
        
        this.element.style.left = `${x + 10}px`;
        this.element.style.top = `${y + 10}px`;
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
    }
    
    getCellSize(canvas) {
        const canvasRect = canvas.getBoundingClientRect();
        const padding = 20;
        const availableWidth = canvasRect.width - padding;
        const cellWidth = (availableWidth - (11 * 2)) / 12;
        return { width: cellWidth, height: 50 };
    }
}

class ChartComponent extends Component {
    constructor(id) {
        super(id, 'chart', 6, 6);
    }
    
    createElement() {
        const element = document.createElement('div');
        element.className = 'component component-chart';
        element.innerHTML = `
            <div>Chart ${this.id}</div>
            <div class="resize-handle"></div>
        `;
        return element;
    }
}

class KPIComponent extends Component {
    constructor(id) {
        super(id, 'kpi', 1, 3);
    }
    
    createElement() {
        const element = document.createElement('div');
        element.className = 'component component-kpi';
        element.innerHTML = `
            <div>KPI ${this.id}</div>
            <div class="resize-handle"></div>
        `;
        return element;
    }
}

class LayoutEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.components = [];
        this.nextId = 1;
        this.draggedComponent = null;
        this.resizeComponent = null;
        this.dragOffset = { x: 0, y: 0 };
        this.previewElement = null;
        this.setupEventListeners();
    }
    
    addComponent(type) {
        let component;
        const id = this.nextId.toString();
        this.nextId++;
        
        if (type === 'chart') {
            component = new ChartComponent(id);
        } else {
            component = new KPIComponent(id);
        }
        
        this.findAvailablePosition(component);
        this.components.push(component);
        this.canvas.appendChild(component.element);
        component.updateElement(this.canvas);
        this.setupComponentEvents(component);
    }
    
    findAvailablePosition(component) {
        for (let row = 0; row < 100; row++) {
            for (let col = 0; col <= 12 - component.position.width; col++) {
                if (this.isPositionAvailable(col, row, component.position.width, component.position.height)) {
                    component.position.col = col;
                    component.position.row = row;
                    return;
                }
            }
        }
    }
    
    isPositionAvailable(col, row, width, height, excludeComponent) {
        if (col < 0 || col + width > 12 || row < 0) {
            return false;
        }
        
        for (const comp of this.components) {
            if (excludeComponent && comp === excludeComponent) continue;
            
            if (this.rectanglesOverlap(
                col, row, width, height,
                comp.position.col, comp.position.row, comp.position.width, comp.position.height
            )) {
                return false;
            }
        }
        return true;
    }
    
    rectanglesOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
        return !(x1 + w1 <= x2 || x2 + w2 <= x1 || y1 + h1 <= y2 || y2 + h2 <= y1);
    }
    
    reflowComponents() {
        // Sort components by their current position (top to bottom, left to right)
        const sortedComponents = [...this.components].sort((a, b) => {
            if (a.position.row === b.position.row) {
                return a.position.col - b.position.col;
            }
            return a.position.row - b.position.row;
        });
        
        // Temporarily remove all components from collision detection
        const originalComponents = [...this.components];
        this.components = [];
        
        // Re-place each component using the same algorithm as addComponent
        for (const component of sortedComponents) {
            this.findAvailablePosition(component);
            this.components.push(component);
            component.updateElement(this.canvas);
        }
    }
    
    setupComponentEvents(component) {
        const element = component.element;
        const resizeHandle = element.querySelector('.resize-handle');
        
        element.addEventListener('mousedown', (e) => {
            if (e.target === resizeHandle) {
                this.startResize(component, e);
            } else {
                this.startDrag(component, e);
            }
        });
    }
    
    startDrag(component, e) {
        e.preventDefault();
        this.draggedComponent = component;
        component.element.classList.add('dragging');
        
        const rect = component.element.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.createPreview();
    }
    
    startResize(component, e) {
        e.preventDefault();
        e.stopPropagation();
        this.resizeComponent = component;
        component.element.classList.add('resizing');
        this.createPreview();
    }
    
    createPreview() {
        this.previewElement = document.createElement('div');
        this.previewElement.className = 'preview-placeholder';
        this.canvas.appendChild(this.previewElement);
    }
    
    updatePreview(col, row, width, height) {
        if (!this.previewElement) return;
        
        const cellSize = this.getCellSize();
        const x = col * cellSize.width + (col * 2);
        const y = row * cellSize.height + (row * 2);
        const previewWidth = width * cellSize.width + (width - 1) * 2;
        const previewHeight = height * cellSize.height + (height - 1) * 2;
        
        this.previewElement.style.left = `${x + 10}px`;
        this.previewElement.style.top = `${y + 10}px`;
        this.previewElement.style.width = `${previewWidth}px`;
        this.previewElement.style.height = `${previewHeight}px`;
    }
    
    getCellSize() {
        const canvasRect = this.canvas.getBoundingClientRect();
        const padding = 20;
        const availableWidth = canvasRect.width - padding;
        const cellWidth = (availableWidth - (11 * 2)) / 12;
        return { width: cellWidth, height: 50 };
    }
    
    getGridPosition(clientX, clientY) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const cellSize = this.getCellSize();
        
        const x = clientX - canvasRect.left - 10;
        const y = clientY - canvasRect.top - 10;
        
        const col = Math.floor(x / (cellSize.width + 2));
        const row = Math.floor(y / (cellSize.height + 2));
        
        return { x: Math.max(0, Math.min(11, col)), y: Math.max(0, row) };
    }
    
    setupEventListeners() {
        document.addEventListener('mousemove', (e) => {
            if (this.draggedComponent) {
                const gridPos = this.getGridPosition(e.clientX - this.dragOffset.x, e.clientY - this.dragOffset.y);
                const maxCol = 12 - this.draggedComponent.position.width;
                const col = Math.max(0, Math.min(maxCol, gridPos.x));
                const row = Math.max(0, gridPos.y);
                
                // Show preview of where the component will be placed
                this.updatePreview(col, row, this.draggedComponent.position.width, this.draggedComponent.position.height);
                
                // Update the actual component position for live feedback
                this.draggedComponent.position.col = col;
                this.draggedComponent.position.row = row;
                this.draggedComponent.updateElement(this.canvas);
            } else if (this.resizeComponent) {
                const gridPos = this.getGridPosition(e.clientX, e.clientY);
                const minWidth = 1;
                const minHeight = 1;
                const maxWidth = 12 - this.resizeComponent.position.col;
                
                const width = Math.max(minWidth, Math.min(maxWidth, gridPos.x - this.resizeComponent.position.col + 1));
                const height = Math.max(minHeight, gridPos.y - this.resizeComponent.position.row + 1);
                
                // Show preview of the new size
                this.updatePreview(this.resizeComponent.position.col, this.resizeComponent.position.row, width, height);
                
                // Update the actual component size for live feedback
                this.resizeComponent.position.width = width;
                this.resizeComponent.position.height = height;
                this.resizeComponent.updateElement(this.canvas);
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (this.draggedComponent) {
                // Position is already set during mousemove, just clean up
                this.draggedComponent.element.classList.remove('dragging');
                this.draggedComponent = null;
                this.cleanupPreview();
                
                // Reflow all components to ensure proper positioning
                this.reflowComponents();
            } else if (this.resizeComponent) {
                // Size is already set during mousemove, just clean up
                this.resizeComponent.element.classList.remove('resizing');
                this.resizeComponent = null;
                this.cleanupPreview();
                
                // Reflow all components to ensure proper positioning
                this.reflowComponents();
            }
        });
    }
    
    cleanupPreview() {
        if (this.previewElement) {
            this.previewElement.remove();
            this.previewElement = null;
        }
    }
}

class Modal {
    constructor(modalId, onAddChart, onAddKPI) {
        this.element = document.getElementById(modalId);
        this.onAddChart = onAddChart;
        this.onAddKPI = onAddKPI;
        this.setupEventListeners();
    }
    
    show() {
        this.element.classList.add('show');
    }
    
    hide() {
        this.element.classList.remove('show');
    }
    
    setupEventListeners() {
        document.getElementById('add-chart').addEventListener('click', () => {
            this.onAddChart();
            this.hide();
        });
        
        document.getElementById('add-kpi').addEventListener('click', () => {
            this.onAddKPI();
            this.hide();
        });
        
        document.getElementById('modal-close').addEventListener('click', () => {
            this.hide();
        });
        
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) {
                this.hide();
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const layoutEngine = new LayoutEngine('canvas');
    
    const modal = new Modal(
        'component-modal',
        () => layoutEngine.addComponent('chart'),
        () => layoutEngine.addComponent('kpi')
    );
    
    document.getElementById('add-component-btn').addEventListener('click', () => {
        modal.show();
    });
});