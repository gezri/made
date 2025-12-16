
export interface ExpansionEvent {
  id: string;
  countryName: string;
  year: number;
  month: number;
  day: number;
  endYear?: number;
  endMonth?: number;
  endDay?: number;
  description?: string;
  isVisited: boolean;
}

export interface MapColors {
  background: string;
  visited: string;
  unvisited: string;
  stroke: string;
  trail: string;
}

export interface GeoFeature {
  type: string;
  id: string | number;
  properties: {
    name: string;
    [key: string]: any;
  };
  geometry: any;
}

export enum SimulationState {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}

export type CounterPosition = 
  | 'top-left' | 'center-left' | 'bottom-left' 
  | 'bottom-center' 
  | 'bottom-right' | 'center-right' | 'top-right' 
  | 'top-center';

export type InfoStyle = 'default' | 'flag-center' | 'minimal' | '3d-card' | 'cinematic' | '3d-worldmap';
export type DateFormat = 'number-name' | 'numeric-full' | 'month-name';
export type MapMode = 'world' | 'usa';

export interface ViewOptions {
  showHeader: boolean;
  showPlanner: boolean;
  showCounter: boolean;
  counterPosition: CounterPosition;
  showCenterIcon: boolean;
  showMotionLines: boolean;
  infoStyle: InfoStyle;
  dateFormat: DateFormat;
}

export interface SimulationConfig {
  zoomInMultiplier: number;  // Multiplier for country focus
  zoomOutScale: number;      // Base scale for the globe (Zoom Out)
  animationSpeed: number;    // MS to travel between points
  waitDuration: number;      // MS to wait at the country before moving next
  centerIconScale: number;   // Scale multiplier for the center icon
  mapMode: MapMode;          // Toggle between World and USA
}
