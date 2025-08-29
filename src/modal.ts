export class Modal {
    private element: HTMLElement;
    private onAddChart: () => void;
    private onAddKPI: () => void;
    private chartListener?: () => void;
    private kpiListener?: () => void;
    private closeListener?: () => void;
    private clickAwayListener?: (e: Event) => void;
    
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
    
    updateCallbacks(onAddChart: () => void, onAddKPI: () => void): void {
        this.onAddChart = onAddChart;
        this.onAddKPI = onAddKPI;
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        // Remove previous listeners if they exist
        if (this.chartListener) {
            document.getElementById('add-chart')!.removeEventListener('click', this.chartListener);
        }
        if (this.kpiListener) {
            document.getElementById('add-kpi')!.removeEventListener('click', this.kpiListener);
        }
        if (this.closeListener) {
            document.getElementById('modal-close')!.removeEventListener('click', this.closeListener);
        }
        if (this.clickAwayListener) {
            this.element.removeEventListener('click', this.clickAwayListener);
        }
        
        // Create new listeners
        this.chartListener = () => {
            this.onAddChart();
            this.hide();
        };
        
        this.kpiListener = () => {
            this.onAddKPI();
            this.hide();
        };
        
        this.closeListener = () => {
            this.hide();
        };
        
        this.clickAwayListener = (e) => {
            if (e.target === this.element) {
                this.hide();
            }
        };
        
        // Add new listeners
        document.getElementById('add-chart')!.addEventListener('click', this.chartListener);
        document.getElementById('add-kpi')!.addEventListener('click', this.kpiListener);
        document.getElementById('modal-close')!.addEventListener('click', this.closeListener);
        this.element.addEventListener('click', this.clickAwayListener);
    }
}