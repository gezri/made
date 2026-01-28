
import React, { useLayoutEffect, useRef, useState, useMemo, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { GeoFeature, MapColors, ExpansionEvent, SimulationState, ViewOptions, SimulationConfig } from '../types';
import { TOPOJSON_URL, US_GEOJSON_URL, HOME_COORDINATES, COUNTRY_ISO_CODES, MAJOR_CITIES } from '../constants';

// Helper to convert hex to RGB for accurate interpolation
const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

// Precise color interpolation between flash and base land colors
const interpolateColor = (color1: string, color2: string, t: number) => {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    if (!c1 || !c2) return color2;
    // Cubic ease-in for the flash fade-out
    const easedT = t * t * t; 
    const r = Math.round(c1.r + (c2.r - c1.r) * easedT);
    const g = Math.round(c1.g + (c2.g - c1.g) * easedT);
    const b = Math.round(c1.b + (c2.b - c1.b) * easedT);
    return `rgb(${r}, ${g}, ${b})`;
};

interface WorldMapProps {
  events: ExpansionEvent[];
  colors: MapColors;
  simulationState: SimulationState;
  currentEventId: string | null;
  onMapReady: (countries: string[]) => void;
  onAnimationComplete: () => void;
  isUiVisible: boolean;
  viewOptions: ViewOptions;
  config: SimulationConfig;
  centerIconUrl: string | null;
  targetMarkerUrl: string | null;
}

const WorldMap: React.FC<WorldMapProps> = ({
  events,
  colors,
  simulationState,
  currentEventId,
  onMapReady,
  onAnimationComplete,
  isUiVisible,
  viewOptions,
  config,
  centerIconUrl,
  targetMarkerUrl
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markersCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [geoData, setGeoData] = useState<GeoFeature[]>([]);
  const [usStatesData, setUsStatesData] = useState<GeoFeature[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [visibleEvent, setVisibleEvent] = useState<ExpansionEvent | null>(null);
  const [isOverlayActive, setIsOverlayActive] = useState(false);

  const projectionRef = useRef<d3.GeoProjection>(d3.geoOrthographic());
  const currentTransform = useRef({ rotate: [0, 0, 0] as [number, number, number], scale: 250, translate: [0, 0] as [number, number] });
  const prevEventIdRef = useRef<string | null>(null);
  const prevSimStateRef = useRef<SimulationState>(SimulationState.IDLE);
  const transitionStartTimeRef = useRef<number>(0);
  const isTransitioningRef = useRef<boolean>(false);

  // Animation states for flash tracking
  const flashTimestamps = useRef<Map<string, number>>(new Map());
  const prevEventsRef = useRef<ExpansionEvent[]>([]);

  // Feature Resolver - handles cities, states, and countries
  const resolveFeature = useCallback((name: string) => {
      const cleanName = name.trim();
      const lowerName = cleanName.toLowerCase();

      // Priority 1: Direct state/country matches
      if (cleanName.endsWith(" (USA)")) return usStatesData.find(f => f.properties.name === cleanName.replace(" (USA)", ""));
      if (cleanName.endsWith(" (Country)")) return geoData.find(f => f.properties.name === cleanName.replace(" (Country)", ""));
      
      // Handle known aliases or common errors
      let feature = geoData.find(f => f.properties.name.toLowerCase() === lowerName) || 
                    usStatesData.find(f => f.properties.name.toLowerCase() === lowerName);
      if (feature) return feature;

      // Priority 2: Cities
      const city = MAJOR_CITIES.find(c => c.name.toLowerCase() === lowerName);
      if (city) {
          const parentName = city.country.toLowerCase();
          feature = geoData.find(f => f.properties.name.toLowerCase() === parentName) || 
                    usStatesData.find(f => f.properties.name.toLowerCase() === parentName);
          if (feature) return feature;
      }

      // Priority 3: Fuzzy USA state match
      if (lowerName.endsWith(" usa") || lowerName.endsWith(" us") || lowerName.includes("virginia")) {
          const raw = cleanName.replace(/,?\s*usa$/i, "").replace(/,?\s*us$/i, "").trim();
          const state = usStatesData.find(f => f.properties.name.toLowerCase() === raw.toLowerCase());
          if (state) return state;
      }
      
      return undefined;
  }, [geoData, usStatesData]);

  // Robust Selection & Visit Flash Detection
  useEffect(() => {
    // 1. Detect when a country/city is selected (Targeted)
    if (currentEventId && currentEventId !== prevEventIdRef.current) {
        const target = events.find(e => e.id === currentEventId);
        if (target) {
            const feature = resolveFeature(target.countryName);
            if (feature) {
                const nameKey = feature.properties.name;
                flashTimestamps.current.set(nameKey, performance.now());
            }
        }
    }

    // 2. Detect when a location is visited (Landed)
    events.forEach(event => {
        const prevEvent = prevEventsRef.current.find(e => e.id === event.id);
        if (event.isVisited && (!prevEvent || !prevEvent.isVisited)) {
            const feature = resolveFeature(event.countryName);
            if (feature) {
                const nameKey = feature.properties.name;
                flashTimestamps.current.set(nameKey, performance.now());
            }
        }
    });

    if (simulationState === SimulationState.IDLE && prevSimStateRef.current !== SimulationState.IDLE) {
        flashTimestamps.current.clear();
    }
    
    prevEventsRef.current = [...events];
  }, [events, currentEventId, simulationState, resolveFeature]);

  // Sync currentEventId to visibleEvent
  useEffect(() => {
    const targetEvent = events.find(e => e.id === currentEventId) || null;
    if (targetEvent) {
      setVisibleEvent(targetEvent);
      setIsOverlayActive(true);
    } else {
      setIsOverlayActive(false);
    }
  }, [currentEventId, events]);

  // Load Map Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        let worldFeatures: GeoFeature[] = [];
        let usFeatures: GeoFeature[] = [];
        
        const usResponse = await fetch(US_GEOJSON_URL);
        const usData = await usResponse.json();
        usFeatures = usData.features;
        setUsStatesData(usFeatures);

        if (config.mapMode === 'usa') {
            setGeoData(usFeatures);
            onMapReady(usFeatures.map(f => f.properties.name).sort());
        } else {
            const response = await fetch(TOPOJSON_URL);
            const data = await response.json();
            // @ts-ignore
            worldFeatures = topojson.feature(data, data.objects.countries).features as GeoFeature[];
            setGeoData(worldFeatures);

            const countrySet = new Set(worldFeatures.map(f => f.properties.name));
            const stateSet = new Set(usFeatures.map(f => f.properties.name));
            const finalNames: string[] = [];
            
            worldFeatures.forEach(f => {
                const name = f.properties.name; if (!name) return;
                finalNames.push(stateSet.has(name) ? `${name} (Country)` : name);
            });
            usFeatures.forEach(f => {
                const name = f.properties.name; if (!name) return;
                if (countrySet.has(name)) finalNames.push(`${name} (USA)`); else finalNames.push(name);
            });
            onMapReady(Array.from(new Set(finalNames)).sort());
        }
      } catch (error) { console.error("Map Data Fetch Error", error); }
    };
    fetchData();
  }, [config.mapMode, onMapReady]);

  // Resize Handling
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });
        const dpr = window.devicePixelRatio || 1;
        [canvasRef, markersCanvasRef].forEach(ref => {
            if (ref.current) {
                ref.current.width = clientWidth * dpr; ref.current.height = clientHeight * dpr;
                ref.current.style.width = `${clientWidth}px`; ref.current.style.height = `${clientHeight}px`;
                const ctx = ref.current.getContext('2d'); if (ctx) ctx.scale(dpr, dpr);
            }
        });
      }
    };
    window.addEventListener('resize', handleResize); handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update Projection
  useEffect(() => {
     if (dimensions.width === 0) return;
     if (config.mapMode === 'usa') {
        projectionRef.current = d3.geoAlbersUsa().translate([dimensions.width / 2, dimensions.height / 2]).scale(dimensions.width * 1.3);
     } else {
        projectionRef.current = d3.geoOrthographic().translate([dimensions.width / 2, dimensions.height / 2]).clipAngle(90);
     }
  }, [config.mapMode, dimensions]);

  // Marker Loader
  const [markerImage, setMarkerImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (targetMarkerUrl) {
        const img = new Image(); img.src = targetMarkerUrl; img.onload = () => setMarkerImage(img);
    } else setMarkerImage(null);
  }, [targetMarkerUrl]);

  // Resolved Event Coordinates
  const resolvedEventData = useMemo(() => {
    return events.map(e => {
        let feature = resolveFeature(e.countryName);
        let explicitCoords: [number, number] | null = e.coordinates || null;
        
        if (!explicitCoords) {
             const city = MAJOR_CITIES.find(c => c.name.toLowerCase() === e.countryName.toLowerCase());
             if (city) explicitCoords = city.coords;
        }
        
        const centroid = explicitCoords || (feature ? d3.geoCentroid(feature as any) : null);
        return { event: e, feature, centroid };
    }).filter(item => item.feature || item.centroid);
  }, [events, resolveFeature]);

  // Master Render Loop
  useLayoutEffect(() => {
    if (!geoData.length || dimensions.width === 0 || !svgRef.current || !canvasRef.current || !markersCanvasRef.current) return;
    const svg = d3.select(svgRef.current);
    const ctx = canvasRef.current.getContext('2d');
    const markerCtx = markersCanvasRef.current.getContext('2d');
    const { width, height } = dimensions;
    const projection = projectionRef.current;
    const pathGeneratorCanvas = d3.geoPath().projection(projection).context(ctx);
    const pathGeneratorMarker = d3.geoPath().projection(projection).context(markerCtx);
    const isGlobe = config.mapMode === 'world';
    const baseScale = isGlobe ? (Math.min(width, height) / 2.2) * config.zoomOutScale : width * 1.3;

    // Defs for atmosphere
    let defs = svg.select('defs');
    if (defs.empty()) {
        defs = svg.append('defs');
        const gradient = defs.append('radialGradient').attr('id', 'atmosphere').attr('cx', '50%').attr('cy', '50%').attr('r', '50%');
        gradient.append('stop').attr('offset', '80%').attr('stop-color', 'transparent');
        gradient.append('stop').attr('offset', '100%').attr('stop-color', '#60a5fa').attr('stop-opacity', 0.3);
    }
    svg.selectAll('circle.atmosphere').remove();
    if (isGlobe) { 
        svg.append('circle').attr('class', 'atmosphere').attr('cx', width/2).attr('cy', height/2).attr('r', (projection as d3.GeoProjection).scale()).attr('fill', 'url(#atmosphere)').attr('pointer-events', 'none'); 
    }

    const render = () => {
        if (!ctx || !markerCtx) return;
        const now = performance.now();
        const visitedNames = new Set<string>();
        resolvedEventData.forEach(r => { if (r.event.isVisited && r.feature) visitedNames.add(r.feature.properties.name); });

        ctx.clearRect(0, 0, width, height); markerCtx.clearRect(0, 0, width, height);
        
        if (isGlobe) {
            ctx.beginPath(); pathGeneratorCanvas({ type: 'Sphere' } as any); ctx.fillStyle = colors.background; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = colors.stroke; ctx.stroke();
            ctx.beginPath(); pathGeneratorCanvas(d3.geoGraticule()() as any); ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; ctx.stroke();
        }

        // Base layer
        ctx.lineWidth = 0.5; ctx.strokeStyle = colors.stroke;
        ctx.beginPath(); geoData.forEach(d => { if (!visitedNames.has(d.properties.name)) pathGeneratorCanvas(d as any); });
        ctx.fillStyle = colors.unvisited; ctx.fill(); ctx.stroke();

        const drawPass = (targetCtx: CanvasRenderingContext2D, pathGen: d3.GeoPath) => {
            const currentTargetEvent = events.find(e => e.id === currentEventId);
            const currentTargetFeature = currentTargetEvent ? resolveFeature(currentTargetEvent.countryName) : null;
            const currentTargetName = currentTargetFeature ? currentTargetFeature.properties.name : null;

            // Render primary geometry (Countries or States depending on mode)
            geoData.forEach(d => {
                const name = d.properties.name;
                const isVisited = visitedNames.has(name);
                const isCurrentTarget = currentTargetName === name;
                const flashStart = flashTimestamps.current.get(name);

                if (isVisited || isCurrentTarget || flashStart) {
                    targetCtx.beginPath(); pathGen(d as any);
                    let baseColor = isVisited ? colors.visited : colors.unvisited;
                    let finalColor = baseColor;
                    if (flashStart && config.flashDuration > 0) {
                        const elapsed = now - flashStart;
                        if (elapsed < config.flashDuration) {
                            finalColor = interpolateColor(colors.flash || '#ffffff', baseColor, elapsed / config.flashDuration);
                        } else { flashTimestamps.current.delete(name); }
                    }
                    targetCtx.fillStyle = finalColor; targetCtx.fill(); targetCtx.stroke();
                }
            });
            
            // Render detailed US states in World Mode
            if (isGlobe && usStatesData.length > 0) {
                 usStatesData.forEach(d => {
                    const name = d.properties.name;
                    const isVisited = visitedNames.has(name);
                    const isCurrentTarget = currentTargetName === name;
                    const flashStart = flashTimestamps.current.get(name);

                    if (isVisited || isCurrentTarget || flashStart) {
                        targetCtx.beginPath(); pathGen(d as any);
                        let baseColor = isVisited ? colors.visited : colors.unvisited;
                        let finalColor = baseColor;
                        if (flashStart && config.flashDuration > 0) {
                            const elapsed = now - flashStart;
                            if (elapsed < config.flashDuration) {
                                finalColor = interpolateColor(colors.flash || '#ffffff', baseColor, elapsed / config.flashDuration);
                            }
                        }
                        targetCtx.fillStyle = finalColor; targetCtx.fill(); targetCtx.stroke();
                    }
                 });
            }
        };

        if (viewOptions.layerConfig?.visited !== 'atmosphere') drawPass(ctx, pathGeneratorCanvas);
        
        if (isGlobe && usStatesData.length > 0) {
            ctx.lineWidth = 0.5; ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)'; ctx.beginPath();
            usStatesData.forEach(d => { pathGeneratorCanvas(d as any); }); ctx.stroke(); 
        }

        const drawTrails = (context: CanvasRenderingContext2D, pathGen: d3.GeoPath) => {
            if (viewOptions.showMotionLines) {
                const currentIndex = events.findIndex(e => e.id === currentEventId);
                if (simulationState === SimulationState.PLAYING && currentIndex > 0) {
                     const prev = resolvedEventData.find(r => r.event.id === events[currentIndex-1].id);
                     const curr = resolvedEventData.find(r => r.event.id === events[currentIndex].id);
                     if (prev && curr && prev.centroid && curr.centroid) {
                        const elapsed = now - transitionStartTimeRef.current;
                        const linearT = Math.min(1, elapsed / config.animationSpeed);
                        const headT = d3.easeCubicInOut(linearT);
                        const tailT = viewOptions.trailStyle === 'static' ? 0 : d3.easeCubicInOut(Math.max(0, linearT - 0.25)); 
                        
                        const interpolator = d3.geoInterpolate(prev.centroid, curr.centroid);
                        const headPoint = interpolator(headT); const tailPoint = interpolator(tailT);
                        const pHead = projection(headPoint); const pTail = projection(tailPoint);
                        
                        if (pHead && pTail) {
                            context.beginPath(); 
                            pathGen({ type: 'LineString', coordinates: [viewOptions.trailStyle === 'static' ? prev.centroid : tailPoint, headPoint] } as any);
                            context.lineWidth = (config.lineWidth || 2.5) * 2;
                            if (viewOptions.trailStyle === 'rainbow') {
                                const grad = context.createLinearGradient(pTail[0], pTail[1], pHead[0], pHead[1]);
                                ['#ef4444','#f59e0b','#fbbf24','#10b981','#3b82f6','#8b5cf6'].forEach((c, i) => grad.addColorStop(i*0.2, c)); context.strokeStyle = grad;
                            } else context.strokeStyle = colors.trail || '#ffffff';
                            context.stroke();
                        }
                     }
                }
            }
        };

        if (viewOptions.layerConfig?.trails !== 'atmosphere') drawTrails(ctx, pathGeneratorCanvas);
        if (viewOptions.layerConfig?.visited === 'atmosphere') drawPass(markerCtx, pathGeneratorMarker);
        if (viewOptions.layerConfig?.trails === 'atmosphere') drawTrails(markerCtx, pathGeneratorMarker);

        if (markerImage) {
            resolvedEventData.forEach(r => {
                 const coords = r.centroid ? projection(r.centroid) : null;
                 if (coords && (r.event.id === currentEventId || r.event.isVisited)) {
                     const isTarget = r.event.id === currentEventId;
                     const scale = (isTarget ? 1.4 : 1.0) * (config.targetMarkerScale || 1.0);
                     const finalSize = 48 * scale;
                     markerCtx.drawImage(markerImage, coords[0] - finalSize/2, coords[1] - finalSize, finalSize, finalSize);
                 }
            });
        }
    };

    const startTransition = () => {
      let targetCenter: [number, number] | null = null; let targetScale = baseScale;
      if (currentEventId !== prevEventIdRef.current) transitionStartTimeRef.current = performance.now();
      
      if (simulationState === SimulationState.COMPLETED) { if (isGlobe) targetCenter = HOME_COORDINATES; targetScale = baseScale; } 
      else if (simulationState === SimulationState.PLAYING && currentEventId) {
         const currentEvent = events.find(e => e.id === currentEventId);
         if (currentEvent) {
             const data = resolvedEventData.find(r => r.event.id === currentEvent.id);
             targetCenter = data?.centroid || null;
             if (targetCenter) targetScale = baseScale * config.zoomInMultiplier;
         }
      }
      
      if (currentEventId === prevEventIdRef.current && simulationState === prevSimStateRef.current && simulationState === SimulationState.IDLE) { render(); return; }
      
      prevEventIdRef.current = currentEventId; prevSimStateRef.current = simulationState;
      
      if (targetCenter) {
        svg.interrupt();
        if (isGlobe) {
            let r1: [number, number, number] = [-targetCenter[0], -targetCenter[1], 0]; const s1 = targetScale; const r0 = currentTransform.current.rotate;
            const lonDiff = r1[0] - r0[0]; if (lonDiff > 180) r1[0] -= 360; else if (lonDiff < -180) r1[0] += 360;
            const s0 = currentTransform.current.scale; isTransitioningRef.current = true;
            svg.transition().duration(config.animationSpeed).ease(d3.easeCubicInOut).tween("projectionUpdate", () => {
                   const i_r = d3.interpolate(r0, r1); const i_s = d3.interpolate(s0, s1);
                   return (t: number) => { const rot = i_r(t) as [number, number, number]; const sc = i_s(t); projection.rotate(rot); projection.scale(sc); svg.select('circle.atmosphere').attr('r', sc); currentTransform.current = { ...currentTransform.current, rotate: rot, scale: sc }; render(); };
                }).on("end", () => { isTransitioningRef.current = false; render(); onAnimationComplete(); });
        } else {
            const px = projection(targetCenter);
            let t1: [number, number] = px ? [width/2 + (width/2 - px[0]), height/2 + (height/2 - px[1])] : [width/2, height/2];
            const t0 = currentTransform.current.translate; const s0 = currentTransform.current.scale; isTransitioningRef.current = true;
            svg.transition().duration(config.animationSpeed).ease(d3.easeCubicInOut).tween("projectionUpdate", () => {
                     const i_t = d3.interpolate(t0, t1); const i_s = d3.interpolate(s0, targetScale);
                     return (t: number) => { const tr = i_t(t); const sc = i_s(t); projection.translate(tr).scale(sc); currentTransform.current = { ...currentTransform.current, translate: tr as [number, number], scale: sc }; render(); };
                }).on("end", () => { isTransitioningRef.current = false; render(); onAnimationComplete(); });
        }
      } else render();
    };

    startTransition();
    const timer = d3.timer(() => { if (!isTransitioningRef.current) render(); });
    return () => timer.stop();
  }, [geoData, usStatesData, dimensions, events, colors, simulationState, currentEventId, config, targetMarkerUrl, markerImage, resolveFeature, onAnimationComplete, resolvedEventData, viewOptions.showMotionLines, viewOptions.layerConfig, viewOptions.trailStyle]);

  const getFlagUrl = useCallback((countryName: string) => {
        const cleanName = countryName.trim();
        let code = COUNTRY_ISO_CODES[cleanName] || COUNTRY_ISO_CODES[cleanName.replace(/ \((USA|Country)\)$/, "")] || COUNTRY_ISO_CODES[MAJOR_CITIES.find(c => c.name.toLowerCase() === cleanName.toLowerCase())?.country || ""];
        return code ? `https://flagcdn.com/w320/${code.toLowerCase()}.png` : null;
  }, []);

  const getFormattedDate = useCallback((event: ExpansionEvent) => {
        const date = new Date(event.year, event.month - 1, event.day);
        if (viewOptions.dateFormat === 'number-name') return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long' });
        if (viewOptions.dateFormat === 'month-name') return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return `${event.year}.${String(event.month).padStart(2, '0')}.${String(event.day).padStart(2, '0')}`;
  }, [viewOptions.dateFormat]);

  const getCounterPositionClass = (pos: string) => {
        switch(pos) {
            case 'top-left': return 'top-6 left-6'; case 'center-left': return 'top-1/2 -translate-y-1/2 left-6'; case 'bottom-left': return 'bottom-6 left-6'; case 'bottom-center': return 'bottom-6 left-1/2 -translate-x-1/2'; case 'bottom-right': return 'bottom-6 right-6'; case 'center-right': return 'top-1/2 -translate-y-1/2 right-6'; case 'top-right': return 'top-6 right-6'; case 'top-center': return 'top-6 left-1/2 -translate-x-1/2'; default: return 'top-6 right-6';
        }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#0f172a] overflow-hidden select-none">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />
      <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />
      <canvas ref={markersCanvasRef} className="absolute inset-0 pointer-events-none z-20" />
      {viewOptions.showCenterIcon && centerIconUrl && (<div className="absolute top-1/2 left-1/2 pointer-events-none z-30 transition-transform duration-300" style={{ transform: `translate(-50%, -50%) scale(${config.centerIconScale})` }}><img src={centerIconUrl} alt="Center" className="w-16 h-16 object-contain opacity-90 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]" /></div>)}
      {viewOptions.showCounter && (<div className={`absolute ${getCounterPositionClass(viewOptions.counterPosition)} pointer-events-none z-50 transition-all duration-500`}><div className="bg-slate-900/80 backdrop-blur-md px-5 py-3 rounded-xl border border-slate-700/50 shadow-2xl flex items-center gap-4 group"><div className="flex flex-col"><span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-0.5">Progress</span><div className="flex items-baseline gap-1.5"><span className="text-2xl font-bold text-white leading-none tracking-tight">{events.filter(e => e.isVisited).length}</span><span className="text-sm text-slate-500 font-medium">/ {events.length}</span></div></div><div className="h-8 w-[1px] bg-slate-700/50"></div><div className="flex flex-col"><span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-0.5">Year</span><span className="text-lg font-bold text-blue-400 leading-none">{visibleEvent ? visibleEvent.year : events[0]?.year || new Date().getFullYear()}</span></div></div></div>)}
      {visibleEvent && (
        <div className={`absolute pointer-events-none transition-all duration-700 ease-in-out z-40 flex flex-col items-center justify-center 
            ${viewOptions.infoStyle === '3d-card' 
                ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' 
                : 'bottom-16 left-1/2 -translate-x-1/2'}
            ${isOverlayActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}
        `}>
           {viewOptions.infoStyle !== 'minimal' && (
                <div className={`bg-slate-900/60 backdrop-blur-md border border-slate-700/50 shadow-2xl rounded-2xl overflow-hidden ${viewOptions.infoStyle === 'flag-center' ? 'p-6 flex-col text-center' : 'p-4 pr-8 flex items-center gap-6'} ${viewOptions.infoStyle === '3d-card' ? 'bg-slate-900/90 p-8 flex-col text-center border-slate-600' : ''} transition-all duration-500`}>
                    {getFlagUrl(visibleEvent.countryName) && (
                        <div className={`relative shadow-lg ${viewOptions.infoStyle === 'flag-center' || viewOptions.infoStyle === '3d-card' ? 'mb-4' : ''}`}>
                            <img src={getFlagUrl(visibleEvent.countryName)!} alt="Flag" className={`object-cover rounded-md ${viewOptions.infoStyle === 'flag-center' || viewOptions.infoStyle === '3d-card' ? 'h-20 w-auto' : 'h-14 w-auto'}`} />
                            <div className="absolute inset-0 rounded-md bg-gradient-to-tr from-black/10 to-white/10 pointer-events-none"></div>
                        </div>
                    )}
                    <div className={`${viewOptions.infoStyle === 'flag-center' || viewOptions.infoStyle === '3d-card' ? 'text-center' : 'text-left'}`}>
                        <h2 className="text-4xl font-bold text-white tracking-tight drop-shadow-lg mb-1">{visibleEvent.countryName}</h2>
                        <div className="flex items-center gap-2 justify-center opacity-90">
                            <span className="text-blue-400 font-mono text-xl font-medium tracking-wide bg-blue-500/10 px-2 py-0.5 rounded">{getFormattedDate(visibleEvent)}</span>
                        </div>
                    </div>
                </div>
           )}
           {viewOptions.infoStyle === 'minimal' && (
               <div className="flex flex-col items-center gap-1">
                   <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 tracking-tighter drop-shadow-2xl">{visibleEvent.countryName.toUpperCase()}</h1>
                   <p className="text-blue-400 font-mono text-lg tracking-widest uppercase opacity-80">{getFormattedDate(visibleEvent)}</p>
               </div>
           )}
        </div>
      )}
    </div>
  );
};

export default WorldMap;
