
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
  coordinates?: [number, number]; // [Longitude, Latitude] for specific city targeting
}

export interface MapColors {
  background: string;
  visited: string;
  unvisited: string;
  stroke: string;
  trail: string;
  flash: string; // Color used for the fade flash effect
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

export type InfoStyle = 'default' | 'flag-center' | 'minimal' | '3d-card' | 'cinematic';
export type DateFormat = 'number-name' | 'numeric-full' | 'month-name';
export type MapMode = 'world' | 'usa';
export type TrailStyle = 'static' | 'grow' | 'rainbow';

export interface LayerConfig {
  trails: 'base' | 'atmosphere';
  visited: 'base' | 'atmosphere';
}

export interface ViewOptions {
  showHeader: boolean;
  showPlanner: boolean;
  showCounter: boolean;
  counterPosition: CounterPosition;
  showCenterIcon: boolean;
  showMotionLines: boolean;
  infoStyle: InfoStyle;
  dateFormat: DateFormat;
  layerConfig: LayerConfig;
  trailStyle: TrailStyle;
}

export interface SimulationConfig {
  zoomInMultiplier: number;  // Multiplier for country focus
  zoomOutScale: number;      // Base scale for the globe (Zoom Out)
  animationSpeed: number;    // MS to travel between points
  waitDuration: number;      // MS to wait at the country before moving next
  centerIconScale: number;   // Scale multiplier for the center icon
  targetMarkerScale: number; // Scale multiplier for the target indicator markers
  flashDuration: number;     // MS for the visit flash animation
  mapMode: MapMode;          // Toggle between World and USA
  lineWidth?: number;
}
