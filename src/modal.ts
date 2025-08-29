export class Modal {
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