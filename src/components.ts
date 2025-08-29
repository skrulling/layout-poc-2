import { GridPosition, Size } from './types'

export abstract class Component {
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
        const x = this.position.col * cellSize.width + (this.position.col * 8);
        const y = this.position.row * cellSize.height + (this.position.row * 8);
        const width = this.position.width * cellSize.width + (this.position.width - 1) * 8;
        const height = this.position.height * cellSize.height + (this.position.height - 1) * 8;
        
        this.element.style.left = `${x + 15}px`;
        this.element.style.top = `${y + 15}px`;
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
    }
    
    private getCellSize(canvas: HTMLElement): Size {
        const canvasRect = canvas.getBoundingClientRect();
        const padding = 30;
        const availableWidth = canvasRect.width - padding;
        const cellWidth = (availableWidth - (11 * 8)) / 12;
        return { width: cellWidth, height: 50 };
    }
}

export class ChartComponent extends Component {
    constructor(id: string) {
        super(id, 'chart', 6, 6);
    }
    
    createElement(): HTMLElement {
        const element = document.createElement('div');
        element.className = 'component component-chart';
        element.innerHTML = `
            <div class="component-content">Chart ${this.id}</div>
            <div class="delete-button" data-component-id="${this.id}">&times;</div>
            <div class="resize-handle north" data-direction="north"></div>
            <div class="resize-handle south" data-direction="south"></div>
            <div class="resize-handle east" data-direction="east"></div>
            <div class="resize-handle west" data-direction="west"></div>
            <div class="resize-handle northeast" data-direction="northeast"></div>
            <div class="resize-handle northwest" data-direction="northwest"></div>
            <div class="resize-handle southeast" data-direction="southeast"></div>
            <div class="resize-handle southwest" data-direction="southwest"></div>
        `;
        return element;
    }
}

export class KPIComponent extends Component {
    constructor(id: string) {
        super(id, 'kpi', 2, 3);
    }
    
    createElement(): HTMLElement {
        const element = document.createElement('div');
        element.className = 'component component-kpi';
        element.innerHTML = `
            <div class="component-content">KPI ${this.id}</div>
            <div class="delete-button" data-component-id="${this.id}">&times;</div>
            <div class="resize-handle north" data-direction="north"></div>
            <div class="resize-handle south" data-direction="south"></div>
            <div class="resize-handle east" data-direction="east"></div>
            <div class="resize-handle west" data-direction="west"></div>
            <div class="resize-handle northeast" data-direction="northeast"></div>
            <div class="resize-handle northwest" data-direction="northwest"></div>
            <div class="resize-handle southeast" data-direction="southeast"></div>
            <div class="resize-handle southwest" data-direction="southwest"></div>
        `;
        return element;
    }
}