export interface Position {
    x: number;
    y: number;
}

export interface Size {
    width: number;
    height: number;
}

export interface GridPosition {
    col: number;
    row: number;
    width: number;
    height: number;
}

export type ComponentType = 'chart' | 'kpi';

export interface ComponentState {
    id: string;
    type: ComponentType;
    position: GridPosition;
}

export interface LayoutState {
    components: ComponentState[];
    version: string;
    lastModified: string;
}