import { Component, ChartComponent, KPIComponent } from './components'
import { Position, Size, ComponentType, ComponentState, LayoutState, GridPosition } from './types'

export class LayoutEngine {
    private canvas: HTMLElement;
    private components: Component[] = [];
    private nextId = 1;
    private draggedComponent: Component | null = null;
    private resizeComponent: Component | null = null;
    private resizeDirection: string | null = null;
    private resizeStartPosition: Position = { x: 0, y: 0 };
    private resizeStartSize: { width: number, height: number, col: number, row: number } = { width: 0, height: 0, col: 0, row: 0 };
    private smoothDragPosition: Position = { x: 0, y: 0 };
    private targetGridPosition: Position = { x: 0, y: 0 };
    private smoothResizeSize: { width: number, height: number } = { width: 0, height: 0 };
    private targetResizeSize: { width: number, height: number } = { width: 0, height: 0 };
    private animationFrame: number | null = null;
    private magneticStrength: number = 0.12; // Lower = more resistance
    private snapThreshold: number = 0.6; // When to snap to next grid position (higher = less sensitive)
    private ghostElement: HTMLElement | null = null;
    private rawCursorPosition: Position = { x: 0, y: 0 };
    private magneticGhostThreshold: number = 0.1; // How close to snap zone before ghost sticks
    private targetResizePosition: Position = { x: 0, y: 0 };
    private rawResizeSize: { width: number, height: number } = { width: 0, height: 0 };
    private rawResizePosition: Position = { x: 0, y: 0 };
    private dragOffset: Position = { x: 0, y: 0 };
    private previewElement: HTMLElement | null = null;
    private reflowEnabled = true;
    private collisionResizeEnabled = false;
    private borderHandles: HTMLElement[] = [];
    private activeBorderHandle: { element: HTMLElement; comp1: Component; comp2: Component; direction: 'horizontal' | 'vertical' } | null = null;
    private currentBreakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    private masterLayout: ComponentState[] = []; // Desktop layout state
    private isRestoringLayout = false;
    
    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId)!;
        this.setupEventListeners();
        this.updateBreakpoint();
        window.addEventListener('resize', () => this.handleResize());
    }
    
    private handleResize(): void {
        const previousBreakpoint = this.currentBreakpoint;
        this.updateBreakpoint();
        
        // If breakpoint changed, handle layout transitions
        if (previousBreakpoint !== this.currentBreakpoint) {
            this.handleBreakpointTransition(previousBreakpoint);
        }
        
        // Always update component positions for new canvas size
        this.components.forEach(component => component.updateElement(this.canvas));
        this.updateBorderHandles();
    }
    
    setReflowEnabled(enabled: boolean): void {
        this.reflowEnabled = enabled;
    }
    
    setCollisionResizeEnabled(enabled: boolean): void {
        this.collisionResizeEnabled = enabled;
    }
    
    private updateBreakpoint(): void {
        const width = window.innerWidth;
        const newBreakpoint = width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
        this.currentBreakpoint = newBreakpoint;
    }
    
    private getMinimumColumns(component: Component): number {
        const type = component.type;
        
        switch (this.currentBreakpoint) {
            case 'mobile':
                return type === 'chart' ? 12 : 6; // Charts full width, KPIs half width
            case 'tablet':
                return type === 'chart' ? 4 : 2;  // Charts quarter width min, KPIs sixth width min
            case 'desktop':
            default:
                return 1; // Full flexibility on desktop
        }
    }
    
    private handleBreakpointTransition(previousBreakpoint: 'mobile' | 'tablet' | 'desktop'): void {
        if (this.currentBreakpoint === 'desktop' && previousBreakpoint !== 'desktop') {
            // Returning to desktop - restore master layout
            this.restoreMasterLayout();
        } else if (previousBreakpoint === 'desktop' && this.currentBreakpoint !== 'desktop') {
            // Leaving desktop - save current layout as master
            this.saveMasterLayout();
            this.enforceBreakpointConstraints();
        } else {
            // Transition between mobile/tablet
            this.enforceBreakpointConstraints();
        }
    }
    
    private enforceBreakpointConstraints(): void {
        for (const component of this.components) {
            const minCols = this.getMinimumColumns(component);
            if (component.position.width < minCols) {
                component.position.width = minCols;
                
                // Check if component needs to be repositioned due to width increase
                if (component.position.col + component.position.width > 12) {
                    component.position.col = Math.max(0, 12 - component.position.width);
                }
                
                component.updateElement(this.canvas);
            }
        }
        
        if (!this.isRestoringLayout) {
            this.reflowComponents();
        }
    }
    
    addComponent(type: ComponentType): void {
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
        this.updateBorderHandles();
        
        // Update master layout if on desktop
        if (this.currentBreakpoint === 'desktop') {
            this.saveMasterLayout();
        }
    }
    
    private findAvailablePosition(component: Component): void {
        // Enforce minimum columns for current breakpoint
        const minCols = this.getMinimumColumns(component);
        component.position.width = Math.max(component.position.width, minCols);
        
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
    
    private hasCollisions(component: Component): boolean {
        for (const comp of this.components) {
            if (comp === component) continue;
            
            if (this.rectanglesOverlap(
                component.position.col, component.position.row, component.position.width, component.position.height,
                comp.position.col, comp.position.row, comp.position.width, comp.position.height
            )) {
                return true;
            }
        }
        return false;
    }
    
    private getOverlappingComponents(activeComponent: Component): Component[] {
        const overlapping: Component[] = [];
        for (const comp of this.components) {
            if (comp === activeComponent) continue;
            
            if (this.rectanglesOverlap(
                activeComponent.position.col, activeComponent.position.row, activeComponent.position.width, activeComponent.position.height,
                comp.position.col, comp.position.row, comp.position.width, comp.position.height
            )) {
                overlapping.push(comp);
            }
        }
        return overlapping;
    }
    
    private resizeOverlappingComponents(activeComponent: Component): void {
        const overlapping = this.getOverlappingComponents(activeComponent);
        
        for (const comp of overlapping) {
            // Calculate overlap area
            const overlapLeft = Math.max(activeComponent.position.col, comp.position.col);
            const overlapRight = Math.min(
                activeComponent.position.col + activeComponent.position.width,
                comp.position.col + comp.position.width
            );
            const overlapTop = Math.max(activeComponent.position.row, comp.position.row);
            const overlapBottom = Math.min(
                activeComponent.position.row + activeComponent.position.height,
                comp.position.row + comp.position.height
            );
            
            const overlapWidth = overlapRight - overlapLeft;
            const overlapHeight = overlapBottom - overlapTop;
            
            // Decide how to resize the overlapping component
            // Priority: try to maintain component proportions
            
            // Option 1: Shrink from right
            if (comp.position.col < activeComponent.position.col) {
                const newWidth = activeComponent.position.col - comp.position.col;
                if (newWidth >= 1) {
                    comp.position.width = newWidth;
                    comp.updateElement(this.canvas);
                    continue;
                }
            }
            
            // Option 2: Shrink from left (move and shrink)
            if (comp.position.col + comp.position.width > activeComponent.position.col + activeComponent.position.width) {
                const newCol = activeComponent.position.col + activeComponent.position.width;
                const newWidth = (comp.position.col + comp.position.width) - newCol;
                if (newWidth >= 1 && newCol < 12) {
                    comp.position.col = newCol;
                    comp.position.width = newWidth;
                    comp.updateElement(this.canvas);
                    continue;
                }
            }
            
            // Option 3: Shrink from bottom
            if (comp.position.row < activeComponent.position.row) {
                const newHeight = activeComponent.position.row - comp.position.row;
                if (newHeight >= 1) {
                    comp.position.height = newHeight;
                    comp.updateElement(this.canvas);
                    continue;
                }
            }
            
            // Option 4: Shrink from top (move and shrink)
            if (comp.position.row + comp.position.height > activeComponent.position.row + activeComponent.position.height) {
                const newRow = activeComponent.position.row + activeComponent.position.height;
                const newHeight = (comp.position.row + comp.position.height) - newRow;
                if (newHeight >= 1) {
                    comp.position.row = newRow;
                    comp.position.height = newHeight;
                    comp.updateElement(this.canvas);
                    continue;
                }
            }
            
            // Fallback: minimize the overlapping component to 1x1
            comp.position.width = 1;
            comp.position.height = 1;
            comp.updateElement(this.canvas);
        }
    }
    
    private previewCollisionResize(activeComponent: Component, newCol: number, newRow: number, newWidth?: number, newHeight?: number): void {
        // Store original positions and sizes
        const originalStates = new Map<Component, GridPosition>();
        this.components.forEach(comp => {
            originalStates.set(comp, { ...comp.position });
        });
        
        // Apply temporary changes to active component
        activeComponent.position.col = newCol;
        activeComponent.position.row = newRow;
        if (newWidth !== undefined) activeComponent.position.width = newWidth;
        if (newHeight !== undefined) activeComponent.position.height = newHeight;
        
        // Resize overlapping components
        this.resizeOverlappingComponents(activeComponent);
        
        // Store preview states
        const previewStates = new Map<Component, GridPosition>();
        this.components.forEach(comp => {
            previewStates.set(comp, { ...comp.position });
        });
        
        // Restore original states
        this.components.forEach(comp => {
            const original = originalStates.get(comp)!;
            comp.position = original;
        });
        
        // Apply preview states for visual feedback
        this.components.forEach(comp => {
            const preview = previewStates.get(comp)!;
            comp.position = preview;
            comp.updateElement(this.canvas);
        });
    }
    
    private reflowComponents(): void {
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

    private previewReflow(activeComponent: Component, newCol: number, newRow: number, newWidth?: number, newHeight?: number): void {
        // Store original positions
        const originalPositions = new Map<Component, GridPosition>();
        this.components.forEach(comp => {
            originalPositions.set(comp, { ...comp.position });
        });
        
        // Apply temporary changes to active component
        const originalActive = { ...activeComponent.position };
        activeComponent.position.col = newCol;
        activeComponent.position.row = newRow;
        if (newWidth !== undefined) activeComponent.position.width = newWidth;
        if (newHeight !== undefined) activeComponent.position.height = newHeight;
        
        // Reflow all components with new positions
        this.reflowComponents();
        
        // Store the preview positions and restore originals
        const previewPositions = new Map<Component, GridPosition>();
        this.components.forEach(comp => {
            previewPositions.set(comp, { ...comp.position });
            const original = originalPositions.get(comp)!;
            comp.position = original;
        });
        
        // Apply preview positions 
        this.components.forEach(comp => {
            const preview = previewPositions.get(comp)!;
            comp.position = preview;
            comp.updateElement(this.canvas);
        });
    }
    
    private setupComponentEvents(component: Component): void {
        const element = component.element;
        const resizeHandles = element.querySelectorAll('.resize-handle');
        const deleteButton = element.querySelector('.delete-button');
        
        element.addEventListener('mousedown', (e) => {
            const target = e.target as HTMLElement;
            if (target && target.classList.contains('delete-button')) {
                e.preventDefault();
                e.stopPropagation();
                this.deleteComponent(component);
            } else if (target && target.classList.contains('resize-handle')) {
                const direction = target.getAttribute('data-direction');
                this.startResize(component, e, direction);
            } else if (!target.classList.contains('resize-handle') && !target.classList.contains('delete-button')) {
                this.startDrag(component, e);
            }
        });
        
        // Add hover effects for resize handles
        resizeHandles.forEach(handle => {
            handle.addEventListener('mouseenter', () => {
                handle.classList.add('active');
            });
            handle.addEventListener('mouseleave', () => {
                handle.classList.remove('active');
            });
        });
        
        // Add delete button click handler
        if (deleteButton) {
            deleteButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.deleteComponent(component);
            });
        }
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
        
        // Initialize smooth drag position to current grid position
        this.smoothDragPosition = {
            x: component.position.col,
            y: component.position.row
        };
        
        this.targetGridPosition = {
            x: component.position.col,
            y: component.position.row
        };
        
        // Initialize raw cursor position to current position
        this.rawCursorPosition = {
            x: component.position.col,
            y: component.position.row
        };
        
        this.createPreview();
        this.startSmoothAnimation();
    }
    
    private startResize(component: Component, e: MouseEvent, direction: string | null): void {
        e.preventDefault();
        e.stopPropagation();
        this.resizeComponent = component;
        this.resizeDirection = direction;
        this.resizeStartPosition = { x: e.clientX, y: e.clientY };
        this.resizeStartSize = {
            width: component.position.width,
            height: component.position.height,
            col: component.position.col,
            row: component.position.row
        };
        
        // Initialize smooth resize
        this.smoothResizeSize = {
            width: component.position.width,
            height: component.position.height
        };
        this.targetResizeSize = {
            width: component.position.width,
            height: component.position.height
        };
        this.targetResizePosition = {
            x: component.position.col,
            y: component.position.row
        };
        
        component.element.classList.add('resizing');
        this.createPreview();
        this.startSmoothAnimation();
    }
    
    private createPreview(): void {
        this.previewElement = document.createElement('div');
        this.previewElement.className = 'preview-placeholder';
        this.canvas.appendChild(this.previewElement);
        
        // Create ghost element for immediate visual feedback
        this.ghostElement = document.createElement('div');
        this.ghostElement.className = 'ghost-outline';
        this.canvas.appendChild(this.ghostElement);
    }
    
    private updatePreview(col: number, row: number, width: number, height: number): void {
        if (!this.previewElement) return;
        
        const cellSize = this.getCellSize();
        const x = col * cellSize.width + (col * 8);
        const y = row * cellSize.height + (row * 8);
        const previewWidth = width * cellSize.width + (width - 1) * 8;
        const previewHeight = height * cellSize.height + (height - 1) * 8;
        
        this.previewElement.style.left = `${x + 15}px`;
        this.previewElement.style.top = `${y + 15}px`;
        this.previewElement.style.width = `${previewWidth}px`;
        this.previewElement.style.height = `${previewHeight}px`;
    }
    
    private getCellSize(): Size {
        const canvasRect = this.canvas.getBoundingClientRect();
        const padding = 30;
        const availableWidth = canvasRect.width - padding;
        const cellWidth = (availableWidth - (11 * 8)) / 12;
        return { width: cellWidth, height: 50 };
    }
    
    private getGridPosition(clientX: number, clientY: number): Position {
        const canvasRect = this.canvas.getBoundingClientRect();
        const cellSize = this.getCellSize();
        
        const x = clientX - canvasRect.left - 15;
        const y = clientY - canvasRect.top - 15;
        
        const col = Math.floor(x / (cellSize.width + 8));
        const row = Math.floor(y / (cellSize.height + 8));
        
        return { x: Math.max(0, Math.min(11, col)), y: Math.max(0, row) };
    }
    
    private setupEventListeners(): void {
        document.addEventListener('mousemove', (e) => {
            if (this.activeBorderHandle) {
                this.handleBorderDrag(e);
            } else if (this.draggedComponent) {
                this.handleSmoothDrag(e);
            } else if (this.resizeComponent) {
                this.handleSmoothResize(e);
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (this.activeBorderHandle) {
                // Finalize border resize
                this.activeBorderHandle.element.classList.remove('dragging');
                this.activeBorderHandle = null;
                this.updateBorderHandles();
            } else if (this.draggedComponent) {
                // Finalize the position
                this.draggedComponent.element.classList.remove('dragging');
                const draggedComp = this.draggedComponent;
                
                // Set final position to target grid position
                draggedComp.position.col = this.targetGridPosition.x;
                draggedComp.position.row = this.targetGridPosition.y;
                
                this.draggedComponent = null;
                this.cleanupPreview();
                
                // Apply final behavior based on enabled modes
                if (this.collisionResizeEnabled) {
                    this.resizeOverlappingComponents(draggedComp);
                } else if (this.reflowEnabled) {
                    this.reflowComponents();
                } else {
                    // Check if the new position creates overlap, if so, revert
                    if (this.hasCollisions(draggedComp)) {
                        // Find a safe position
                        this.findAvailablePosition(draggedComp);
                    }
                    draggedComp.updateElement(this.canvas);
                }
                
                // Save master layout if on desktop
                if (this.currentBreakpoint === 'desktop') {
                    this.saveMasterLayout();
                }
                
                this.updateBorderHandles();
            } else if (this.resizeComponent) {
                // Finalize the size
                this.resizeComponent.element.classList.remove('resizing');
                const resizedComp = this.resizeComponent;
                
                // Apply final dimensions and position based on resize direction
                this.applyFinalResize(resizedComp);
                
                this.resizeComponent = null;
                this.resizeDirection = null;
                this.cleanupPreview();
                
                // Apply final behavior based on enabled modes
                if (this.collisionResizeEnabled) {
                    this.resizeOverlappingComponents(resizedComp);
                } else if (this.reflowEnabled) {
                    this.reflowComponents();
                } else {
                    // Check if the new size creates overlap, if so, revert
                    if (this.hasCollisions(resizedComp)) {
                        // Find a safe size or position
                        this.findAvailablePosition(resizedComp);
                    }
                    resizedComp.updateElement(this.canvas);
                }
                
                // Save master layout if on desktop
                if (this.currentBreakpoint === 'desktop') {
                    this.saveMasterLayout();
                }
                
                this.updateBorderHandles();
            }
        });
    }
    
    private handleComponentResize(e: MouseEvent): void {
        if (!this.resizeComponent || !this.resizeDirection) return;
        
        const deltaX = e.clientX - this.resizeStartPosition.x;
        const deltaY = e.clientY - this.resizeStartPosition.y;
        const cellSize = this.getCellSize();
        
        // Convert pixel deltas to grid deltas
        const gridDeltaX = Math.round(deltaX / (cellSize.width + 8));
        const gridDeltaY = Math.round(deltaY / (cellSize.height + 8));
        
        let newCol = this.resizeStartSize.col;
        let newRow = this.resizeStartSize.row;
        let newWidth = this.resizeStartSize.width;
        let newHeight = this.resizeStartSize.height;
        
        const minWidth = this.getMinimumColumns(this.resizeComponent);
        const minHeight = 1;
        
        // Calculate new dimensions based on resize direction
        switch (this.resizeDirection) {
            case 'north':
                newRow = Math.max(0, this.resizeStartSize.row + gridDeltaY);
                newHeight = Math.max(minHeight, this.resizeStartSize.height - gridDeltaY);
                break;
            case 'south':
                newHeight = Math.max(minHeight, this.resizeStartSize.height + gridDeltaY);
                break;
            case 'east':
                newWidth = Math.max(minWidth, Math.min(12 - this.resizeStartSize.col, this.resizeStartSize.width + gridDeltaX));
                break;
            case 'west':
                newCol = Math.max(0, this.resizeStartSize.col + gridDeltaX);
                newWidth = Math.max(minWidth, this.resizeStartSize.width - gridDeltaX);
                // Don't let the component extend beyond the grid
                if (newCol + newWidth > 12) {
                    newWidth = 12 - newCol;
                }
                break;
            case 'northeast':
                newRow = Math.max(0, this.resizeStartSize.row + gridDeltaY);
                newHeight = Math.max(minHeight, this.resizeStartSize.height - gridDeltaY);
                newWidth = Math.max(minWidth, Math.min(12 - this.resizeStartSize.col, this.resizeStartSize.width + gridDeltaX));
                break;
            case 'northwest':
                newRow = Math.max(0, this.resizeStartSize.row + gridDeltaY);
                newHeight = Math.max(minHeight, this.resizeStartSize.height - gridDeltaY);
                newCol = Math.max(0, this.resizeStartSize.col + gridDeltaX);
                newWidth = Math.max(minWidth, this.resizeStartSize.width - gridDeltaX);
                if (newCol + newWidth > 12) {
                    newWidth = 12 - newCol;
                }
                break;
            case 'southeast':
                newHeight = Math.max(minHeight, this.resizeStartSize.height + gridDeltaY);
                newWidth = Math.max(minWidth, Math.min(12 - this.resizeStartSize.col, this.resizeStartSize.width + gridDeltaX));
                break;
            case 'southwest':
                newHeight = Math.max(minHeight, this.resizeStartSize.height + gridDeltaY);
                newCol = Math.max(0, this.resizeStartSize.col + gridDeltaX);
                newWidth = Math.max(minWidth, this.resizeStartSize.width - gridDeltaX);
                if (newCol + newWidth > 12) {
                    newWidth = 12 - newCol;
                }
                break;
        }
        
        // Apply the resize
        if (this.collisionResizeEnabled) {
            this.previewCollisionResize(this.resizeComponent, newCol, newRow, newWidth, newHeight);
        } else if (this.reflowEnabled) {
            this.previewReflow(this.resizeComponent, newCol, newRow, newWidth, newHeight);
        } else {
            this.resizeComponent.position.col = newCol;
            this.resizeComponent.position.row = newRow;
            this.resizeComponent.position.width = newWidth;
            this.resizeComponent.position.height = newHeight;
            this.resizeComponent.updateElement(this.canvas);
        }
        
        // Update preview placeholder
        this.updatePreview(newCol, newRow, newWidth, newHeight);
    }
    
    private handleSmoothDrag(e: MouseEvent): void {
        if (!this.draggedComponent) return;
        
        const rawGridPos = this.getGridPosition(e.clientX - this.dragOffset.x, e.clientY - this.dragOffset.y);
        const maxCol = 12 - this.draggedComponent.position.width;
        const targetCol = Math.max(0, Math.min(maxCol, rawGridPos.x));
        const targetRow = Math.max(0, rawGridPos.y);
        
        // Update raw cursor position immediately (for ghost outline)
        this.rawCursorPosition = { x: targetCol, y: targetRow };
        
        // Update ghost element immediately
        this.updateGhostElement();
        
        // Calculate magnetic snapping for the actual component
        const currentCol = this.smoothDragPosition.x;
        const currentRow = this.smoothDragPosition.y;
        
        // Check if we should snap to next grid position
        const colDiff = targetCol - currentCol;
        const rowDiff = targetRow - currentRow;
        
        if (Math.abs(colDiff) > this.snapThreshold) {
            this.targetGridPosition.x = targetCol;
        }
        if (Math.abs(rowDiff) > this.snapThreshold) {
            this.targetGridPosition.y = targetRow;
        }
        
        // Update preview placeholder to show target snap position
        this.updatePreview(this.targetGridPosition.x, this.targetGridPosition.y, 
                          this.draggedComponent.position.width, this.draggedComponent.position.height);
    }
    
    private handleSmoothResize(e: MouseEvent): void {
        if (!this.resizeComponent || !this.resizeDirection) return;
        
        const deltaX = e.clientX - this.resizeStartPosition.x;
        const deltaY = e.clientY - this.resizeStartPosition.y;
        const cellSize = this.getCellSize();
        
        // Convert pixel deltas to grid deltas (floating point for smooth interpolation)
        const gridDeltaX = deltaX / (cellSize.width + 8);
        const gridDeltaY = deltaY / (cellSize.height + 8);
        
        const minWidth = this.getMinimumColumns(this.resizeComponent);
        const minHeight = 1;
        
        // Calculate target dimensions and positions
        let targetWidth = this.resizeStartSize.width;
        let targetHeight = this.resizeStartSize.height;
        let targetCol = this.resizeStartSize.col;
        let targetRow = this.resizeStartSize.row;
        
        // Handle width changes and column position for west/east resizing
        switch (this.resizeDirection) {
            case 'east':
            case 'southeast':
            case 'northeast':
                targetWidth = Math.max(minWidth, Math.min(12 - this.resizeStartSize.col, this.resizeStartSize.width + gridDeltaX));
                break;
            case 'west':
            case 'southwest':
            case 'northwest':
                // For west resizing, we need to move the component and change its width
                const newWidth = Math.max(minWidth, this.resizeStartSize.width - gridDeltaX);
                const widthDelta = newWidth - this.resizeStartSize.width;
                targetCol = Math.max(0, this.resizeStartSize.col - widthDelta);
                targetWidth = newWidth;
                
                // Ensure we don't go beyond grid bounds
                if (targetCol + targetWidth > 12) {
                    targetWidth = 12 - targetCol;
                }
                break;
        }
        
        // Handle height changes and row position for north/south resizing
        switch (this.resizeDirection) {
            case 'south':
            case 'southeast':
            case 'southwest':
                targetHeight = Math.max(minHeight, this.resizeStartSize.height + gridDeltaY);
                break;
            case 'north':
            case 'northeast':
            case 'northwest':
                // For north resizing, we need to move the component and change its height
                const newHeight = Math.max(minHeight, this.resizeStartSize.height - gridDeltaY);
                const heightDelta = newHeight - this.resizeStartSize.height;
                targetRow = Math.max(0, this.resizeStartSize.row - heightDelta);
                targetHeight = newHeight;
                break;
        }
        
        // Apply magnetic snapping
        const widthDiff = targetWidth - this.smoothResizeSize.width;
        const heightDiff = targetHeight - this.smoothResizeSize.height;
        
        if (Math.abs(widthDiff) > this.snapThreshold) {
            this.targetResizeSize.width = Math.round(targetWidth);
        }
        if (Math.abs(heightDiff) > this.snapThreshold) {
            this.targetResizeSize.height = Math.round(targetHeight);
        }
        
        // Store raw resize data for immediate ghost feedback
        this.rawResizeSize = { width: targetWidth, height: targetHeight };
        this.rawResizePosition = { x: targetCol, y: targetRow };
        
        // Store target position for position-changing resize directions
        this.targetResizePosition = { x: targetCol, y: targetRow };
        
        // Update ghost element immediately
        this.updateResizeGhostElement();
        
        // Update preview with target size and position
        this.updatePreview(this.targetResizePosition.x, this.targetResizePosition.y, this.targetResizeSize.width, this.targetResizeSize.height);
    }
    
    private startSmoothAnimation(): void {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        const animate = () => {
            if (this.draggedComponent) {
                this.updateSmoothDrag();
            }
            if (this.resizeComponent) {
                this.updateSmoothResize();
            }
            
            if (this.draggedComponent || this.resizeComponent) {
                this.animationFrame = requestAnimationFrame(animate);
            }
        };
        
        this.animationFrame = requestAnimationFrame(animate);
    }
    
    private updateSmoothDrag(): void {
        if (!this.draggedComponent) return;
        
        // Interpolate toward target position with magnetic resistance
        const targetX = this.targetGridPosition.x;
        const targetY = this.targetGridPosition.y;
        
        this.smoothDragPosition.x += (targetX - this.smoothDragPosition.x) * this.magneticStrength;
        this.smoothDragPosition.y += (targetY - this.smoothDragPosition.y) * this.magneticStrength;
        
        // Update visual position (smooth interpolation)
        this.updateComponentSmoothPosition(this.draggedComponent, this.smoothDragPosition.x, this.smoothDragPosition.y);
    }
    
    private updateSmoothResize(): void {
        if (!this.resizeComponent) return;
        
        // Interpolate toward target size with magnetic resistance
        this.smoothResizeSize.width += (this.targetResizeSize.width - this.smoothResizeSize.width) * this.magneticStrength;
        this.smoothResizeSize.height += (this.targetResizeSize.height - this.smoothResizeSize.height) * this.magneticStrength;
        
        // Update visual size and position (smooth interpolation)
        this.updateComponentSmoothSizeAndPosition(this.resizeComponent, 
            this.targetResizePosition.x, this.targetResizePosition.y,
            this.smoothResizeSize.width, this.smoothResizeSize.height);
    }
    
    private updateComponentSmoothPosition(component: Component, smoothCol: number, smoothRow: number): void {
        const cellSize = this.getCellSize();
        const x = smoothCol * cellSize.width + (smoothCol * 8);
        const y = smoothRow * cellSize.height + (smoothRow * 8);
        const width = component.position.width * cellSize.width + (component.position.width - 1) * 8;
        const height = component.position.height * cellSize.height + (component.position.height - 1) * 8;
        
        component.element.style.left = `${x + 15}px`;
        component.element.style.top = `${y + 15}px`;
        component.element.style.width = `${width}px`;
        component.element.style.height = `${height}px`;
    }
    
    private updateComponentSmoothSize(component: Component, smoothWidth: number, smoothHeight: number): void {
        const cellSize = this.getCellSize();
        const x = component.position.col * cellSize.width + (component.position.col * 8);
        const y = component.position.row * cellSize.height + (component.position.row * 8);
        const width = smoothWidth * cellSize.width + (smoothWidth - 1) * 8;
        const height = smoothHeight * cellSize.height + (smoothHeight - 1) * 8;
        
        component.element.style.left = `${x + 15}px`;
        component.element.style.top = `${y + 15}px`;
        component.element.style.width = `${width}px`;
        component.element.style.height = `${height}px`;
    }
    
    private updateComponentSmoothSizeAndPosition(component: Component, smoothCol: number, smoothRow: number, smoothWidth: number, smoothHeight: number): void {
        const cellSize = this.getCellSize();
        const x = smoothCol * cellSize.width + (smoothCol * 8);
        const y = smoothRow * cellSize.height + (smoothRow * 8);
        const width = smoothWidth * cellSize.width + (smoothWidth - 1) * 8;
        const height = smoothHeight * cellSize.height + (smoothHeight - 1) * 8;
        
        component.element.style.left = `${x + 15}px`;
        component.element.style.top = `${y + 15}px`;
        component.element.style.width = `${width}px`;
        component.element.style.height = `${height}px`;
    }
    
    private stopSmoothAnimation(): void {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
    
    private updateGhostElement(): void {
        if (!this.ghostElement || !this.draggedComponent) return;
        
        // Apply magnetic stickiness to ghost position
        const magneticPos = this.applyMagneticStickiness(
            this.rawCursorPosition.x, 
            this.rawCursorPosition.y
        );
        
        // Check for collisions at ghost position
        const hasCollision = this.checkGhostCollision(
            magneticPos.x, 
            magneticPos.y, 
            this.draggedComponent.position.width, 
            this.draggedComponent.position.height,
            this.draggedComponent
        );
        
        // Show ghost at magnetic position for immediate feedback with stickiness
        const cellSize = this.getCellSize();
        const ghostX = magneticPos.x * cellSize.width + (magneticPos.x * 8);
        const ghostY = magneticPos.y * cellSize.height + (magneticPos.y * 8);
        const ghostWidth = this.draggedComponent.position.width * cellSize.width + (this.draggedComponent.position.width - 1) * 8;
        const ghostHeight = this.draggedComponent.position.height * cellSize.height + (this.draggedComponent.position.height - 1) * 8;
        
        // Always show ghost outline at good visibility
        const opacity = 0.8;
        
        // Update collision state
        if (hasCollision) {
            this.ghostElement.classList.add('collision');
        } else {
            this.ghostElement.classList.remove('collision');
        }
        
        this.ghostElement.style.left = `${ghostX + 15}px`;
        this.ghostElement.style.top = `${ghostY + 15}px`;
        this.ghostElement.style.width = `${ghostWidth}px`;
        this.ghostElement.style.height = `${ghostHeight}px`;
        this.ghostElement.style.opacity = opacity.toString();
    }
    
    private updateResizeGhostElement(): void {
        if (!this.ghostElement || !this.resizeComponent) return;
        
        // Apply magnetic stickiness to ghost position and size
        const magneticPos = this.applyMagneticStickiness(
            this.rawResizePosition.x, 
            this.rawResizePosition.y
        );
        const magneticWidth = this.applyMagneticStickinessToSize(this.rawResizeSize.width);
        const magneticHeight = this.applyMagneticStickinessToSize(this.rawResizeSize.height);
        
        // Check for collisions at ghost position/size
        const hasCollision = this.checkGhostCollision(
            magneticPos.x, 
            magneticPos.y, 
            magneticWidth, 
            magneticHeight,
            this.resizeComponent
        );
        
        // Show ghost at magnetic position/size for immediate feedback with stickiness
        const cellSize = this.getCellSize();
        const ghostX = magneticPos.x * cellSize.width + (magneticPos.x * 8);
        const ghostY = magneticPos.y * cellSize.height + (magneticPos.y * 8);
        const ghostWidth = Math.max(cellSize.width, magneticWidth * cellSize.width + (magneticWidth - 1) * 8);
        const ghostHeight = Math.max(cellSize.height, magneticHeight * cellSize.height + (magneticHeight - 1) * 8);
        
        // Always show ghost outline at good visibility, especially when resizing
        const opacity = 0.9;
        
        // Update collision state
        if (hasCollision) {
            this.ghostElement.classList.add('collision');
        } else {
            this.ghostElement.classList.remove('collision');
        }
        
        this.ghostElement.style.left = `${ghostX + 15}px`;
        this.ghostElement.style.top = `${ghostY + 15}px`;
        this.ghostElement.style.width = `${ghostWidth}px`;
        this.ghostElement.style.height = `${ghostHeight}px`;
        this.ghostElement.style.opacity = opacity.toString();
    }
    
    private applyMagneticStickiness(rawX: number, rawY: number): Position {
        // Apply magnetic stickiness to position - snap to nearest grid when close
        const roundedX = Math.round(rawX);
        const roundedY = Math.round(rawY);
        
        const distanceX = Math.abs(rawX - roundedX);
        const distanceY = Math.abs(rawY - roundedY);
        
        const magneticX = distanceX < this.magneticGhostThreshold ? roundedX : rawX;
        const magneticY = distanceY < this.magneticGhostThreshold ? roundedY : rawY;
        
        return { x: magneticX, y: magneticY };
    }
    
    private applyMagneticStickinessToSize(rawSize: number): number {
        // Apply magnetic stickiness to size - snap to nearest integer when close
        const rounded = Math.round(rawSize);
        const distance = Math.abs(rawSize - rounded);
        
        return distance < this.magneticGhostThreshold ? rounded : rawSize;
    }
    
    private checkGhostCollision(col: number, row: number, width: number, height: number, excludeComponent: Component): boolean {
        // Check if ghost position would overlap with any other components
        if (col < 0 || col + width > 12 || row < 0) {
            return true; // Out of bounds
        }
        
        for (const comp of this.components) {
            if (comp === excludeComponent) continue;
            
            if (this.rectanglesOverlap(
                col, row, width, height,
                comp.position.col, comp.position.row, comp.position.width, comp.position.height
            )) {
                return true;
            }
        }
        return false;
    }
    
    private cleanupPreview(): void {
        if (this.previewElement) {
            this.previewElement.remove();
            this.previewElement = null;
        }
        if (this.ghostElement) {
            this.ghostElement.remove();
            this.ghostElement = null;
        }
        this.stopSmoothAnimation();
    }
    
    private saveMasterLayout(): void {
        this.masterLayout = this.components.map(component => ({
            id: component.id,
            type: component.type as ComponentType,
            position: { ...component.position }
        }));
    }
    
    private restoreMasterLayout(): void {
        if (this.masterLayout.length === 0) return;
        
        this.isRestoringLayout = true;
        
        // Restore positions from master layout
        for (const savedState of this.masterLayout) {
            const component = this.components.find(c => c.id === savedState.id);
            if (component) {
                component.position = { ...savedState.position };
                component.updateElement(this.canvas);
            }
        }
        
        this.isRestoringLayout = false;
        this.updateBorderHandles();
    }
    
    // Public API methods for layout management
    exportLayout(): LayoutState {
        const currentLayout = this.currentBreakpoint === 'desktop' ? 
            this.components.map(c => ({ id: c.id, type: c.type as ComponentType, position: { ...c.position } })) :
            this.masterLayout;
            
        return {
            components: currentLayout,
            version: '1.0.0',
            lastModified: new Date().toISOString()
        };
    }
    
    importLayout(layoutState: LayoutState): void {
        // Clear existing components
        this.components.forEach(component => component.element.remove());
        this.components = [];
        this.borderHandles.forEach(handle => handle.remove());
        this.borderHandles = [];
        
        // Create components from layout state
        let maxId = 0;
        for (const componentState of layoutState.components) {
            const id = componentState.id;
            maxId = Math.max(maxId, parseInt(id));
            
            let component: Component;
            if (componentState.type === 'chart') {
                component = new ChartComponent(id);
            } else {
                component = new KPIComponent(id);
            }
            
            component.position = { ...componentState.position };
            this.components.push(component);
            this.canvas.appendChild(component.element);
            component.updateElement(this.canvas);
            this.setupComponentEvents(component);
        }
        
        this.nextId = maxId + 1;
        this.saveMasterLayout(); // Save as new master layout
        this.updateBorderHandles();
    }
    
    getCurrentBreakpoint(): string {
        return this.currentBreakpoint;
    }
    
    getMasterLayout(): ComponentState[] {
        return [...this.masterLayout];
    }
    
    clearCanvas(): void {
        // Remove all components
        this.components.forEach(component => {
            component.element.remove();
        });
        this.components = [];
        
        // Clear border handles
        this.borderHandles.forEach(handle => handle.remove());
        this.borderHandles = [];
        
        // Clear master layout
        this.masterLayout = [];
        
        // Reset ID counter
        this.nextId = 1;
        
        // Clean up any active interactions
        this.cleanupPreview();
        this.draggedComponent = null;
        this.resizeComponent = null;
    }
    
    private applyFinalResize(component: Component): void {
        if (!this.resizeDirection) return;
        
        const finalWidth = Math.round(this.targetResizeSize.width);
        const finalHeight = Math.round(this.targetResizeSize.height);
        
        let finalCol = component.position.col;
        let finalRow = component.position.row;
        
        // Calculate final position for directions that move the component
        switch (this.resizeDirection) {
            case 'west':
            case 'northwest':
            case 'southwest':
                finalCol = this.resizeStartSize.col + (this.resizeStartSize.width - finalWidth);
                break;
            case 'north':
            case 'northeast':
            case 'northwest':
                finalRow = this.resizeStartSize.row + (this.resizeStartSize.height - finalHeight);
                break;
        }
        
        // Apply final position and size
        component.position.col = Math.max(0, finalCol);
        component.position.row = Math.max(0, finalRow);
        component.position.width = finalWidth;
        component.position.height = finalHeight;
        
        // Ensure component doesn't go out of bounds
        if (component.position.col + component.position.width > 12) {
            component.position.width = 12 - component.position.col;
        }
    }
    
    private deleteComponent(component: Component): void {
        // Remove component from array
        const index = this.components.indexOf(component);
        if (index > -1) {
            this.components.splice(index, 1);
        }
        
        // Remove DOM element
        component.element.remove();
        
        // Update border handles
        this.updateBorderHandles();
        
        // Reflow remaining components if enabled
        if (this.reflowEnabled) {
            this.reflowComponents();
        }
        
        // Save master layout if on desktop
        if (this.currentBreakpoint === 'desktop') {
            this.saveMasterLayout();
        }
    }
    
    private updateBorderHandles(): void {
        // Remove existing border handles
        this.borderHandles.forEach(handle => handle.remove());
        this.borderHandles = [];
        
        // Find adjacent components and create handles
        for (let i = 0; i < this.components.length; i++) {
            for (let j = i + 1; j < this.components.length; j++) {
                const comp1 = this.components[i];
                const comp2 = this.components[j];
                
                // Check if components are horizontally adjacent (sharing vertical border)
                if (this.areHorizontallyAdjacent(comp1, comp2)) {
                    this.createVerticalBorderHandle(comp1, comp2);
                }
                
                // Check if components are vertically adjacent (sharing horizontal border)
                if (this.areVerticallyAdjacent(comp1, comp2)) {
                    this.createHorizontalBorderHandle(comp1, comp2);
                }
            }
        }
    }
    
    private areHorizontallyAdjacent(comp1: Component, comp2: Component): boolean {
        // Check if they share a vertical border (one ends where other begins)
        const comp1Right = comp1.position.col + comp1.position.width;
        const comp2Right = comp2.position.col + comp2.position.width;
        
        const adjacentVertically = 
            (comp1Right === comp2.position.col || comp2Right === comp1.position.col) &&
            this.rangesOverlap(
                comp1.position.row, comp1.position.row + comp1.position.height,
                comp2.position.row, comp2.position.row + comp2.position.height
            );
            
        return adjacentVertically;
    }
    
    private areVerticallyAdjacent(comp1: Component, comp2: Component): boolean {
        // Check if they share a horizontal border (one ends where other begins)
        const comp1Bottom = comp1.position.row + comp1.position.height;
        const comp2Bottom = comp2.position.row + comp2.position.height;
        
        const adjacentHorizontally = 
            (comp1Bottom === comp2.position.row || comp2Bottom === comp1.position.row) &&
            this.rangesOverlap(
                comp1.position.col, comp1.position.col + comp1.position.width,
                comp2.position.col, comp2.position.col + comp2.position.width
            );
            
        return adjacentHorizontally;
    }
    
    private rangesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
        return Math.max(start1, start2) < Math.min(end1, end2);
    }
    
    private createVerticalBorderHandle(comp1: Component, comp2: Component): void {
        const handle = document.createElement('div');
        handle.className = 'border-handle vertical';
        
        // Determine which component is on the left
        const leftComp = comp1.position.col < comp2.position.col ? comp1 : comp2;
        const rightComp = comp1.position.col < comp2.position.col ? comp2 : comp1;
        
        // Calculate shared border area
        const borderCol = leftComp.position.col + leftComp.position.width;
        const sharedTop = Math.max(leftComp.position.row, rightComp.position.row);
        const sharedBottom = Math.min(
            leftComp.position.row + leftComp.position.height,
            rightComp.position.row + rightComp.position.height
        );
        
        // Position the handle (centered on border with larger hover area)
        const cellSize = this.getCellSize();
        const x = borderCol * cellSize.width + (borderCol * 8) - 8;
        const y = sharedTop * cellSize.height + (sharedTop * 8);
        const height = (sharedBottom - sharedTop) * cellSize.height + ((sharedBottom - sharedTop - 1) * 8);
        
        handle.style.left = `${x + 15}px`;
        handle.style.top = `${y + 15}px`;
        handle.style.height = `${height}px`;
        
        // Add event listeners
        this.setupBorderHandleEvents(handle, leftComp, rightComp, 'vertical');
        
        this.canvas.appendChild(handle);
        this.borderHandles.push(handle);
    }
    
    private createHorizontalBorderHandle(comp1: Component, comp2: Component): void {
        const handle = document.createElement('div');
        handle.className = 'border-handle horizontal';
        
        // Determine which component is on top
        const topComp = comp1.position.row < comp2.position.row ? comp1 : comp2;
        const bottomComp = comp1.position.row < comp2.position.row ? comp2 : comp1;
        
        // Calculate shared border area
        const borderRow = topComp.position.row + topComp.position.height;
        const sharedLeft = Math.max(topComp.position.col, bottomComp.position.col);
        const sharedRight = Math.min(
            topComp.position.col + topComp.position.width,
            bottomComp.position.col + bottomComp.position.width
        );
        
        // Position the handle (centered on border with larger hover area)
        const cellSize = this.getCellSize();
        const x = sharedLeft * cellSize.width + (sharedLeft * 8);
        const y = borderRow * cellSize.height + (borderRow * 8) - 8;
        const width = (sharedRight - sharedLeft) * cellSize.width + ((sharedRight - sharedLeft - 1) * 8);
        
        handle.style.left = `${x + 15}px`;
        handle.style.top = `${y + 15}px`;
        handle.style.width = `${width}px`;
        
        // Add event listeners
        this.setupBorderHandleEvents(handle, topComp, bottomComp, 'horizontal');
        
        this.canvas.appendChild(handle);
        this.borderHandles.push(handle);
    }
    
    private setupBorderHandleEvents(handle: HTMLElement, comp1: Component, comp2: Component, direction: 'horizontal' | 'vertical'): void {
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            this.activeBorderHandle = { element: handle, comp1, comp2, direction };
            handle.classList.add('dragging');
        });
    }
    
    private handleBorderDrag(e: MouseEvent): void {
        if (!this.activeBorderHandle) return;
        
        const { comp1, comp2, direction } = this.activeBorderHandle;
        const gridPos = this.getGridPosition(e.clientX, e.clientY);
        
        if (direction === 'vertical') {
            // Dragging vertical border (left-right resize)
            const leftComp = comp1.position.col < comp2.position.col ? comp1 : comp2;
            const rightComp = comp1.position.col < comp2.position.col ? comp2 : comp1;
            
            // Calculate new border position
            const minCol = leftComp.position.col + 1; // Left component needs at least 1 column
            const maxCol = rightComp.position.col + rightComp.position.width - 1; // Right component needs at least 1 column
            const newBorderCol = Math.max(minCol, Math.min(maxCol, gridPos.x));
            
            // Resize components
            const leftNewWidth = newBorderCol - leftComp.position.col;
            const rightNewCol = newBorderCol;
            const rightNewWidth = (rightComp.position.col + rightComp.position.width) - rightNewCol;
            
            if (leftNewWidth >= 1 && rightNewWidth >= 1) {
                leftComp.position.width = leftNewWidth;
                rightComp.position.col = rightNewCol;
                rightComp.position.width = rightNewWidth;
                
                leftComp.updateElement(this.canvas);
                rightComp.updateElement(this.canvas);
            }
            
        } else if (direction === 'horizontal') {
            // Dragging horizontal border (top-bottom resize)
            const topComp = comp1.position.row < comp2.position.row ? comp1 : comp2;
            const bottomComp = comp1.position.row < comp2.position.row ? comp2 : comp1;
            
            // Calculate new border position
            const minRow = topComp.position.row + 1; // Top component needs at least 1 row
            const maxRow = bottomComp.position.row + bottomComp.position.height - 1; // Bottom component needs at least 1 row
            const newBorderRow = Math.max(minRow, Math.min(maxRow, gridPos.y));
            
            // Resize components
            const topNewHeight = newBorderRow - topComp.position.row;
            const bottomNewRow = newBorderRow;
            const bottomNewHeight = (bottomComp.position.row + bottomComp.position.height) - bottomNewRow;
            
            if (topNewHeight >= 1 && bottomNewHeight >= 1) {
                topComp.position.height = topNewHeight;
                bottomComp.position.row = bottomNewRow;
                bottomComp.position.height = bottomNewHeight;
                
                topComp.updateElement(this.canvas);
                bottomComp.updateElement(this.canvas);
            }
        }
    }
}