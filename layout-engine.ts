interface Position {
    x: number;
    y: number;
}

interface Size {
    width: number;
    height: number;
}

interface GridPosition {
    col: number;
    row: number;
    width: number;
    height: number;
}

abstract class Component {
    id: string;
    type: string;
    position: GridPosition;
    element: HTMLElement;
    
    constructor(id: string, type: string, defaultWidth: number, defaultHeight: number) {
        this.id = id;
        this.type = type;
        this.position = { col: 0, row: 0, width: defaultWidth, height: defaultHeight };
        this.element = this.createElement();
    }
    
    abstract createElement(): HTMLElement;
    
    updateElement(canvas: HTMLElement): void {
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
    
    private getCellSize(canvas: HTMLElement): Size {
        const canvasRect = canvas.getBoundingClientRect();
        const padding = 20;
        const availableWidth = canvasRect.width - padding;
        const cellWidth = (availableWidth - (11 * 2)) / 12;
        return { width: cellWidth, height: 50 };
    }
}

class ChartComponent extends Component {
    constructor(id: string) {
        super(id, 'chart', 6, 6);
    }
    
    createElement(): HTMLElement {
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
    constructor(id: string) {
        super(id, 'kpi', 1, 3);
    }
    
    createElement(): HTMLElement {
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
    private canvas: HTMLElement;
    private components: Component[] = [];
    private nextId = 1;
    private draggedComponent: Component | null = null;
    private resizeComponent: Component | null = null;
    private dragOffset: Position = { x: 0, y: 0 };
    private previewElement: HTMLElement | null = null;
    
    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId)!;
        this.setupEventListeners();
    }
    
    addComponent(type: 'chart' | 'kpi'): void {
        let component: Component;
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
    
    private findAvailablePosition(component: Component): void {
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
    
    private isPositionAvailable(col: number, row: number, width: number, height: number, excludeComponent?: Component): boolean {
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
    
    private rectanglesOverlap(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean {
        return !(x1 + w1 <= x2 || x2 + w2 <= x1 || y1 + h1 <= y2 || y2 + h2 <= y1);
    }
    
    private reflowComponents(): void {
        const sortedComponents = [...this.components].sort((a, b) => {
            if (a.position.row === b.position.row) {
                return a.position.col - b.position.col;
            }
            return a.position.row - b.position.row;
        });
        
        for (const component of sortedComponents) {
            this.findAvailablePosition(component);
            component.updateElement(this.canvas);
        }
    }
    
    private setupComponentEvents(component: Component): void {
        const element = component.element;
        const resizeHandle = element.querySelector('.resize-handle') as HTMLElement;
        
        element.addEventListener('mousedown', (e) => {
            if (e.target === resizeHandle) {
                this.startResize(component, e);
            } else {
                this.startDrag(component, e);
            }
        });
    }
    
    private startDrag(component: Component, e: MouseEvent): void {
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
    
    private startResize(component: Component, e: MouseEvent): void {
        e.preventDefault();
        e.stopPropagation();
        this.resizeComponent = component;
        component.element.classList.add('resizing');
        this.createPreview();
    }
    
    private createPreview(): void {
        this.previewElement = document.createElement('div');
        this.previewElement.className = 'preview-placeholder';
        this.canvas.appendChild(this.previewElement);
    }
    
    private updatePreview(col: number, row: number, width: number, height: number): void {
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
    
    private getCellSize(): Size {
        const canvasRect = this.canvas.getBoundingClientRect();
        const padding = 20;
        const availableWidth = canvasRect.width - padding;
        const cellWidth = (availableWidth - (11 * 2)) / 12;
        return { width: cellWidth, height: 50 };
    }
    
    private getGridPosition(clientX: number, clientY: number): Position {
        const canvasRect = this.canvas.getBoundingClientRect();
        const cellSize = this.getCellSize();
        
        const x = clientX - canvasRect.left - 10;
        const y = clientY - canvasRect.top - 10;
        
        const col = Math.floor(x / (cellSize.width + 2));
        const row = Math.floor(y / (cellSize.height + 2));
        
        return { x: Math.max(0, Math.min(11, col)), y: Math.max(0, row) };
    }
    
    private setupEventListeners(): void {
        document.addEventListener('mousemove', (e) => {
            if (this.draggedComponent) {
                const gridPos = this.getGridPosition(e.clientX - this.dragOffset.x, e.clientY - this.dragOffset.y);
                const maxCol = 12 - this.draggedComponent.position.width;
                const col = Math.max(0, Math.min(maxCol, gridPos.x));
                const row = Math.max(0, gridPos.y);
                
                this.updatePreview(col, row, this.draggedComponent.position.width, this.draggedComponent.position.height);
            } else if (this.resizeComponent) {
                const gridPos = this.getGridPosition(e.clientX, e.clientY);
                const minWidth = 1;
                const minHeight = 1;
                const maxWidth = 12 - this.resizeComponent.position.col;
                
                const width = Math.max(minWidth, Math.min(maxWidth, gridPos.x - this.resizeComponent.position.col + 1));
                const height = Math.max(minHeight, gridPos.y - this.resizeComponent.position.row + 1);
                
                this.updatePreview(this.resizeComponent.position.col, this.resizeComponent.position.row, width, height);
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (this.draggedComponent) {
                const gridPos = this.getGridPosition(e.clientX - this.dragOffset.x, e.clientY - this.dragOffset.y);
                const maxCol = 12 - this.draggedComponent.position.width;
                const col = Math.max(0, Math.min(maxCol, gridPos.x));
                const row = Math.max(0, gridPos.y);
                
                if (this.isPositionAvailable(col, row, this.draggedComponent.position.width, this.draggedComponent.position.height, this.draggedComponent)) {
                    this.draggedComponent.position.col = col;
                    this.draggedComponent.position.row = row;
                }
                
                this.draggedComponent.element.classList.remove('dragging');
                this.draggedComponent = null;
                this.cleanupPreview();
                this.reflowComponents();
            } else if (this.resizeComponent) {
                const gridPos = this.getGridPosition(e.clientX, e.clientY);
                const minWidth = 1;
                const minHeight = 1;
                const maxWidth = 12 - this.resizeComponent.position.col;
                
                const width = Math.max(minWidth, Math.min(maxWidth, gridPos.x - this.resizeComponent.position.col + 1));
                const height = Math.max(minHeight, gridPos.y - this.resizeComponent.position.row + 1);
                
                if (this.isPositionAvailable(this.resizeComponent.position.col, this.resizeComponent.position.row, width, height, this.resizeComponent)) {
                    this.resizeComponent.position.width = width;
                    this.resizeComponent.position.height = height;
                }
                
                this.resizeComponent.element.classList.remove('resizing');
                this.resizeComponent = null;
                this.cleanupPreview();
                this.reflowComponents();
            }
        });
    }
    
    private cleanupPreview(): void {
        if (this.previewElement) {
            this.previewElement.remove();
            this.previewElement = null;
        }
    }
}

class Modal {
    private element: HTMLElement;
    private onAddChart: () => void;
    private onAddKPI: () => void;
    
    constructor(modalId: string, onAddChart: () => void, onAddKPI: () => void) {
        this.element = document.getElementById(modalId)!;
        this.onAddChart = onAddChart;
        this.onAddKPI = onAddKPI;
        this.setupEventListeners();
    }
    
    show(): void {
        this.element.classList.add('show');
    }
    
    hide(): void {
        this.element.classList.remove('show');
    }
    
    private setupEventListeners(): void {
        document.getElementById('add-chart')!.addEventListener('click', () => {
            this.onAddChart();
            this.hide();
        });
        
        document.getElementById('add-kpi')!.addEventListener('click', () => {
            this.onAddKPI();
            this.hide();
        });
        
        document.getElementById('modal-close')!.addEventListener('click', () => {
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
    
    document.getElementById('add-component-btn')!.addEventListener('click', () => {
        modal.show();
    });
});