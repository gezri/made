
import React, { useLayoutEffect, useRef, useState, useMemo, useEffect } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { GeoFeature, MapColors, ExpansionEvent, SimulationState, ViewOptions, SimulationConfig } from '../types';
import { TOPOJSON_URL, US_GEOJSON_URL, HOME_COUNTRY, COUNTRY_ISO_CODES, HOME_COORDINATES } from '../constants';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [geoData, setGeoData] = useState<GeoFeature[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Internal state for "Fade Close -> Fade Open" cycle logic
  const [visibleEvent, setVisibleEvent] = useState<ExpansionEvent | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  // Use separate refs for projection to switch types efficiently
  const projectionRef = useRef<d3.GeoProjection>(d3.geoOrthographic());
  
  // Track current rotation/scale/translate for smooth transitions
  const currentTransform = useRef({ rotate: [0, 0, 0] as [number, number, number], scale: 250, translate: [0, 0] as [number, number] });
  
  // Track previous state to avoid unnecessary re-animations
  const prevEventIdRef = useRef<string | null>(null);
  const prevSimStateRef = useRef<SimulationState>(SimulationState.IDLE);
  const prevMapModeRef = useRef<string>(config.mapMode);

  // Sync currentEventId to visibleEvent with Delay logic for transitions
  useEffect(() => {
    const targetEvent = events.find(e => e.id === currentEventId) || null;
    
    // Only apply the "Exit -> Enter" cycle for '3d-worldmap' style when playing
    if (viewOptions.infoStyle === '3d-worldmap' && simulationState === SimulationState.PLAYING) {
        if (targetEvent?.id !== visibleEvent?.id) {
             if (visibleEvent) {
                 // Trigger exit of current visible event
                 setIsExiting(true);
                 const timer = setTimeout(() => {
                     setVisibleEvent(targetEvent);
                     setIsExiting(false);
                 }, 600); // 600ms exit duration matches CSS
                 return () => clearTimeout(timer);
             } else {
                 // First event, just show it
                 setVisibleEvent(targetEvent);
                 setIsExiting(false);
             }
        }
    } else {
        // For all other styles, sync immediately
        setVisibleEvent(targetEvent);
        setIsExiting(false);
    }
  }, [currentEventId, events, viewOptions.infoStyle, simulationState]);

  // Load Map Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        let features: GeoFeature[] = [];
        let names: string[] = [];

        if (config.mapMode === 'usa') {
            const response = await fetch(US_GEOJSON_URL);
            const data = await response.json();
            features = data.features;
        } else {
            const response = await fetch(TOPOJSON_URL);
            const data = await response.json();
            // @ts-ignore
            features = topojson.feature(data, data.objects.countries).features as GeoFeature[];
        }
        
        setGeoData(features);
        
        names = features
          .map(f => f.properties.name)
          .filter(n => n)
          .sort();
        onMapReady(names);
      } catch (error) {
        console.error("Failed to load map data", error);
      }
    };
    fetchData();
  }, [config.mapMode]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });
        
        // Resize canvas resolution for high DPI
        if (canvasRef.current) {
            const dpr = window.devicePixelRatio || 1;
            canvasRef.current.width = clientWidth * dpr;
            canvasRef.current.height = clientHeight * dpr;
            canvasRef.current.style.width = `${clientWidth}px`;
            canvasRef.current.style.height = `${clientHeight}px`;
            
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.scale(dpr, dpr);
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update Projection Logic
  useEffect(() => {
     if (dimensions.width === 0) return;
     
     // Re-initialize projection based on mode
     if (config.mapMode === 'usa') {
        projectionRef.current = d3.geoAlbersUsa()
            .translate([dimensions.width / 2, dimensions.height / 2])
            .scale(dimensions.width * 1.3);
     } else {
        projectionRef.current = d3.geoOrthographic()
            .translate([dimensions.width / 2, dimensions.height / 2])
            .clipAngle(90);
     }
     
     // Reset transform ref when mode changes
     if (prevMapModeRef.current !== config.mapMode) {
        if (config.mapMode === 'usa') {
            currentTransform.current = { 
                rotate: [0,0,0], 
                scale: dimensions.width * 1.3, 
                translate: [dimensions.width / 2, dimensions.height / 2] 
            };
        } else {
            const baseScale = (Math.min(dimensions.width, dimensions.height) / 2.2) * config.zoomOutScale;
            currentTransform.current = { 
                rotate: [-HOME_COORDINATES[0], -HOME_COORDINATES[1], 0], 
                scale: baseScale, 
                translate: [dimensions.width / 2, dimensions.height / 2]
            };
            projectionRef.current.rotate([-HOME_COORDINATES[0], -HOME_COORDINATES[1], 0]);
        }
        prevMapModeRef.current = config.mapMode;
     }

  }, [config.mapMode, dimensions]);

  // Load Target Marker Image for Canvas
  const [markerImage, setMarkerImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (targetMarkerUrl) {
        const img = new Image();
        img.src = targetMarkerUrl;
        img.onload = () => setMarkerImage(img);
    } else {
        setMarkerImage(null);
    }
  }, [targetMarkerUrl]);

  // D3 Render & Logic
  useLayoutEffect(() => {
    if (!geoData.length || dimensions.width === 0 || !svgRef.current || !canvasRef.current) return;

    const svg = d3.select(svgRef.current);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const { width, height } = dimensions;
    const projection = projectionRef.current;
    
    // SVG Path Generator
    const pathGeneratorSvg = d3.geoPath().projection(projection);
    
    // Canvas Path Generator
    const pathGeneratorCanvas = d3.geoPath().projection(projection).context(ctx);

    const isGlobe = config.mapMode === 'world';

    // Base Scale Calculation
    let baseScale = 0;
    if (isGlobe) {
        baseScale = (Math.min(width, height) / 2.2) * config.zoomOutScale;
    } else {
        baseScale = width * 1.3;
    }

    // Initial positioning for Globe mode if needed
    if (isGlobe && simulationState === SimulationState.IDLE && prevSimStateRef.current !== SimulationState.IDLE) {
         if (currentTransform.current.scale === 250) {
           (projection as d3.GeoProjection).scale(baseScale).rotate([-HOME_COORDINATES[0], -HOME_COORDINATES[1], 0]);
           currentTransform.current = { 
               rotate: [-HOME_COORDINATES[0], -HOME_COORDINATES[1], 0], 
               scale: baseScale,
               translate: [width/2, height/2]
           };
         }
    }

    // Define defs for SVG (Gradients)
    let defs = svg.select('defs');
    if (defs.empty()) {
        defs = svg.append('defs');
        const gradient = defs.append('radialGradient')
            .attr('id', 'atmosphere')
            .attr('cx', '50%')
            .attr('cy', '50%')
            .attr('r', '50%');
        gradient.append('stop').attr('offset', '80%').attr('stop-color', 'transparent');
        gradient.append('stop').attr('offset', '100%').attr('stop-color', '#60a5fa').attr('stop-opacity', 0.3);
    }

    /**
     * CORE RENDER FUNCTION
     * @param animationProgress - 0 to 1, used to animate the active trail growing
     */
    const render = (animationProgress: number = 1.0) => {
      // --- SVG LAYER (Base Map) ---
      svg.selectAll('g.map-layer').remove(); 
      const g = svg.append('g').attr('class', 'map-layer');

      // 1. Background (Ocean)
      if (isGlobe) {
          g.append('path')
            .datum({ type: 'Sphere' })
            .attr('d', pathGeneratorSvg as any)
            .attr('fill', colors.background)
            .attr('stroke', colors.stroke)
            .attr('stroke-width', 1);

          const graticule = d3.geoGraticule();
          g.append('path')
            .datum(graticule())
            .attr('d', pathGeneratorSvg as any)
            .attr('fill', 'none')
            .attr('stroke', '#ffffff')
            .attr('stroke-opacity', 0.05);
      }

      // 2. Features (Countries)
      g.selectAll('path.feature')
        .data(geoData)
        .enter()
        .append('path')
        .attr('class', 'feature')
        .attr('d', pathGeneratorSvg as any)
        .attr('fill', (d: GeoFeature) => {
           const isVisited = events.some(e => e.countryName === d.properties.name && e.isVisited);
           return isVisited ? colors.visited : colors.unvisited;
        })
        .attr('stroke', colors.stroke)
        .attr('stroke-width', 0.5);

       // Atmosphere (SVG)
       if (isGlobe) {
          g.append('circle')
            .attr('cx', width / 2)
            .attr('cy', height / 2)
            .attr('r', (projection as d3.GeoProjection).scale())
            .attr('fill', 'url(#atmosphere)')
            .attr('pointer-events', 'none');
       }

       // --- CANVAS LAYER (Trails & Markers) ---
       if (!ctx) return;
       ctx.clearRect(0, 0, width, height);
       
       if (viewOptions.showMotionLines) {
           // Prepare trails
           const currentIndex = events.findIndex(e => e.id === currentEventId);
           const maxStaticIndex = simulationState === SimulationState.PLAYING 
               ? Math.max(-1, currentIndex - 1) 
               : events.length - 1;

           // Config for Trails
           const trailColor = colors.trail || '#ffffff';
           
           ctx.lineCap = 'round';
           ctx.lineJoin = 'round';

           // A. Static Trails (History)
           // Batch path drawing for performance if desired, or individual for glows
           ctx.beginPath();
           for (let i = 0; i < maxStaticIndex; i++) {
               const startEvent = events[i];
               const endEvent = events[i + 1];
               if (!startEvent || !endEvent) continue;

               const startFeature = geoData.find(f => f.properties.name === startEvent.countryName);
               const endFeature = geoData.find(f => f.properties.name === endEvent.countryName);
               
               if (startFeature && endFeature) {
                   const startCentroid = d3.geoCentroid(startFeature as any);
                   const endCentroid = d3.geoCentroid(endFeature as any);
                   pathGeneratorCanvas({
                       type: 'LineString',
                       coordinates: [startCentroid, endCentroid]
                   });
               }
           }
           
           // Stroke Static
           ctx.lineWidth = 2.5;
           ctx.strokeStyle = trailColor;
           ctx.globalAlpha = 0.6;
           ctx.shadowColor = trailColor;
           ctx.shadowBlur = 10;
           ctx.stroke();
           
           // Reset for Active
           ctx.globalAlpha = 1.0;
           ctx.shadowBlur = 0;

           // B. Active Trail (Animating)
           if (simulationState === SimulationState.PLAYING && currentIndex > 0) {
                const prevEvent = events[currentIndex - 1];
                const currEvent = events[currentIndex];
                const startFeature = geoData.find(f => f.properties.name === prevEvent.countryName);
                const endFeature = geoData.find(f => f.properties.name === currEvent.countryName);

                if (startFeature && endFeature) {
                    const startCentroid = d3.geoCentroid(startFeature as any);
                    const endCentroid = d3.geoCentroid(endFeature as any);
                    const interpolatedEnd = d3.geoInterpolate(startCentroid, endCentroid)(animationProgress);
                    
                    const activeObj = {
                         type: 'LineString',
                         coordinates: [startCentroid, interpolatedEnd]
                    };

                    // Draw Active Glow
                    ctx.beginPath();
                    pathGeneratorCanvas(activeObj as any);
                    ctx.strokeStyle = trailColor;
                    ctx.lineWidth = 4;
                    ctx.shadowColor = 'white'; // White hot core for active
                    ctx.shadowBlur = 20;
                    ctx.stroke();
                }
           }
       }

       // C. Target Markers (Canvas for synchronization)
       if (markerImage) {
            const eventsToShow = events.filter((e, idx) => e.isVisited || e.id === currentEventId);
            
            // Remove shadow for images
            ctx.shadowBlur = 0;
            
            eventsToShow.forEach(event => {
                 const feature = geoData.find(f => f.properties.name === event.countryName);
                 if (feature) {
                     const centroid = d3.geoCentroid(feature as any);
                     const coords = projection(centroid);
                     // Check if visible (not clipped on back of globe)
                     if (coords && d3.geoPath().projection(projection)({type:'Point', coordinates: centroid})) {
                         const [cx, cy] = coords;
                         const isTarget = event.id === currentEventId;
                         
                         const size = 48;
                         const scale = isTarget && animationProgress > 0.9 ? 1.2 : 1.0;
                         const finalSize = size * scale;
                         
                         const x = cx - finalSize / 2;
                         const y = cy - finalSize; // Bottom center anchored

                         ctx.globalAlpha = isTarget ? 1.0 : 0.85;
                         ctx.drawImage(markerImage, x, y, finalSize, finalSize);
                     }
                 }
            });
            ctx.globalAlpha = 1.0;
       }
    };

    // Camera / Animation Logic
    const animateCamera = () => {
      let targetCenter: [number, number] | null = null;
      let targetScale = baseScale;
      let duration = config.animationSpeed;
      
      if (simulationState === SimulationState.COMPLETED) {
         if (isGlobe) targetCenter = HOME_COORDINATES;
         targetScale = baseScale; 
      } else if (simulationState === SimulationState.PLAYING && currentEventId) {
         const currentEvent = events.find(e => e.id === currentEventId);
         if (currentEvent) {
            const feature = geoData.find(f => f.properties.name === currentEvent.countryName);
            if (feature) {
               targetCenter = d3.geoCentroid(feature as any);
               targetScale = baseScale * config.zoomInMultiplier; 
            }
         }
      }

      const hasTargetChanged = currentEventId !== prevEventIdRef.current;
      const hasStateChanged = simulationState !== prevSimStateRef.current;
      
      if (!hasTargetChanged && !hasStateChanged && targetCenter) {
          if (simulationState === SimulationState.IDLE) {
             const currentBase = isGlobe ? (Math.min(width, height) / 2.2) * config.zoomOutScale : width * 1.3;
             if (Math.abs(currentTransform.current.scale - currentBase) > 1) {
                render(1);
             }
          } else if (simulationState === SimulationState.PLAYING) {
             render(1); 
          }
          return;
      }

      prevEventIdRef.current = currentEventId;
      prevSimStateRef.current = simulationState;

      if (targetCenter) {
        svg.interrupt(); // Stop any D3 transitions on the SVG selection (which we use for tweening)

        if (isGlobe) {
            const r1: [number, number, number] = [-targetCenter[0], -targetCenter[1], 0];
            const s1 = targetScale;
            const r0 = currentTransform.current.rotate;
            const s0 = currentTransform.current.scale;
            const needsZoomOut = simulationState === SimulationState.PLAYING && s0 > baseScale * 1.5; 
            
            svg.transition()
                .duration(duration)
                .ease(d3.easeCubicInOut)
                .tween("render", () => {
                   const i_r = d3.interpolate(r0, r1);
                   const i_s = needsZoomOut 
                      ? (t: number) => {
                          if (t < 0.5) return d3.interpolate(s0, baseScale)(t * 2);
                          return d3.interpolate(baseScale, s1)((t - 0.5) * 2);
                        }
                      : d3.interpolate(s0, s1);

                   return (t: number) => {
                      projection.rotate(i_r(t) as [number, number, number]);
                      projection.scale(i_s(t));
                      currentTransform.current = { ...currentTransform.current, rotate: projection.rotate() as any, scale: projection.scale() };
                      render(t);
                   };
                })
                .on("end", () => { render(1); onAnimationComplete(); });
        } else {
            // USA Albers
            const tempProj = d3.geoAlbersUsa().scale(targetScale).translate([width/2, height/2]);
            const px = tempProj(targetCenter);
            let t1: [number, number] = px ? [width/2 + (width/2 - px[0]), height/2 + (height/2 - px[1])] : [width/2, height/2];
            
            const t0 = currentTransform.current.translate;
            const s0 = currentTransform.current.scale;
            const needsZoomOut = simulationState === SimulationState.PLAYING && s0 > baseScale * 1.5;

            svg.transition()
                .duration(duration)
                .ease(d3.easeCubicInOut)
                .tween("render", () => {
                     const i_t = d3.interpolate(t0, t1);
                     const i_s = needsZoomOut 
                      ? (t: number) => {
                          if (t < 0.5) return d3.interpolate(s0, baseScale)(t * 2);
                          return d3.interpolate(baseScale, targetScale)((t - 0.5) * 2);
                        }
                      : d3.interpolate(s0, targetScale);
                     
                     return (t: number) => {
                         projection.translate(i_t(t)).scale(i_s(t));
                         currentTransform.current = { ...currentTransform.current, translate: projection.translate() as [number, number], scale: projection.scale() };
                         render(t);
                     };
                })
                .on("end", () => { render(1); onAnimationComplete(); });
        }
      } else {
        render(1);
      }
    };

    animateCamera();

    // Drag behavior (Idle only)
    if (simulationState === SimulationState.IDLE || simulationState === SimulationState.COMPLETED) {
       const drag = d3.drag<SVGSVGElement, unknown>()
        .on('drag', (event) => {
           if (isGlobe) {
              const rotate = projection.rotate();
              const k = 75 / projection.scale();
              projection.rotate([rotate[0] + event.dx * k, rotate[1] - event.dy * k]);
              currentTransform.current.rotate = projection.rotate();
           } else {
              const currT = projection.translate();
              projection.translate([currT[0] + event.dx, currT[1] + event.dy]);
              currentTransform.current.translate = projection.translate() as [number, number];
           }
           render(1);
        });
        svg.call(drag);
    } else {
       svg.on('.drag', null);
    }

  }, [geoData, dimensions, events, colors, simulationState, currentEventId, config, targetMarkerUrl, markerImage]);

  const getFlagUrl = (name: string) => {
    if (config.mapMode === 'usa') return null;
    const code = COUNTRY_ISO_CODES[name];
    return code ? `https://flagcdn.com/w160/${code.toLowerCase()}.png` : null;
  };

  const getFormattedDate = (event: ExpansionEvent) => {
      switch (viewOptions.dateFormat) {
          case 'number-name':
              return `${event.day.toString().padStart(2, '0')} ${new Date(0, event.month - 1).toLocaleString('default', { month: 'long' })}`;
          case 'month-name':
              return `${new Date(0, event.month - 1).toLocaleString('default', { month: 'long' })} ${event.year}`;
          case 'numeric-full':
          default:
              return `${event.year}.${event.month.toString().padStart(2, '0')}.${event.day.toString().padStart(2, '0')}`;
      }
  };

  const visitedCount = events.filter(e => e.isVisited).length;
  const totalCount = events.length;

  const getCounterPositionClass = (pos: string) => {
      switch(pos) {
          case 'top-left': return 'top-8 left-8';
          case 'center-left': return 'top-1/2 left-8 -translate-y-1/2';
          case 'bottom-left': return 'bottom-8 left-8';
          case 'bottom-center': return 'bottom-8 left-1/2 -translate-x-1/2';
          case 'bottom-right': return 'bottom-8 right-8';
          case 'center-right': return 'top-1/2 right-8 -translate-y-1/2';
          case 'top-right': return 'top-8 right-8';
          case 'top-center': return 'top-8 left-1/2 -translate-x-1/2';
          default: return 'top-8 right-8';
      }
  };
  
  // Decide which event to show based on style
  // For '3d-worldmap', we use the locally managed visibleEvent (for exit transitions).
  // For others, we assume instant switch (visibleEvent syncs instantly in useEffect).
  const displayEvent = visibleEvent;

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full bg-slate-950 overflow-hidden"
    >
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: translate(-50%, -45%) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        .animate-cinematic-enter {
          animation: fadeInScale 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes foldIn {
          0% { opacity: 0; transform: perspective(1000px) rotateX(45deg) scale(0.8) translateY(20px); }
          100% { opacity: 1; transform: perspective(1000px) rotateX(0deg) scale(1) translateY(0); }
        }
        @keyframes foldOut {
          0% { opacity: 1; transform: perspective(1000px) rotateX(0deg) scale(1) translateY(0); }
          100% { opacity: 0; transform: perspective(1000px) rotateX(-45deg) scale(0.8) translateY(-20px); }
        }
        .animate-3d-enter {
           animation: foldIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-3d-exit {
           animation: foldOut 0.5s cubic-bezier(0.32, 0, 0.67, 0) forwards;
        }
      `}</style>
      
      <svg ref={svgRef} className="absolute inset-0 w-full h-full block cursor-move z-10">
        <g></g>
      </svg>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block pointer-events-none z-20" />
      
      {/* Center Icon System */}
      {viewOptions.showCenterIcon && centerIconUrl && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[25] flex items-center justify-center">
              <img 
                 src={centerIconUrl} 
                 alt="Center Decoration" 
                 style={{ 
                    width: `${128 * config.centerIconScale}px`, 
                    height: `${128 * config.centerIconScale}px` 
                 }}
                 className="object-contain opacity-80" 
              />
          </div>
      )}
      
      {/* Information Overlay */}
      {isUiVisible && simulationState === SimulationState.PLAYING && displayEvent && (
         <>
           {(viewOptions.infoStyle === 'default' || viewOptions.infoStyle === 'flag-center' || viewOptions.infoStyle === 'minimal' || viewOptions.infoStyle === '3d-card') && (
               <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-30 min-w-[300px]">
                   {viewOptions.infoStyle === 'default' && (
                     <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-xl shadow-2xl border border-slate-700/50">
                       <div className="flex items-center gap-5">
                          <div className="w-20 h-14 bg-slate-800 rounded overflow-hidden flex-shrink-0 border border-slate-600 shadow-inner">
                            {getFlagUrl(displayEvent.countryName) ? (
                                <img 
                                    src={getFlagUrl(displayEvent.countryName)!} 
                                    alt={displayEvent.countryName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">
                                   {config.mapMode === 'usa' ? '🇺🇸' : '🏳️'}
                                </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <h2 className="text-2xl font-bold leading-tight tracking-tight">{displayEvent.countryName}</h2>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
                                EXPANSION EVENT
                              </div>
                              <p className="text-sm font-medium text-slate-400 font-mono">
                                {getFormattedDate(displayEvent)}
                            </p>
                          </div>
                          </div>
                       </div>
                     </div>
                   )}

                   {viewOptions.infoStyle === 'flag-center' && (
                     <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-xl shadow-2xl border border-slate-700/50">
                       <div className="flex flex-col items-center text-center gap-3 py-2">
                          <div className="w-32 h-20 bg-slate-800 rounded overflow-hidden shadow-lg border border-slate-600">
                            {getFlagUrl(displayEvent.countryName) ? (
                                <img 
                                    src={getFlagUrl(displayEvent.countryName)!} 
                                    alt={displayEvent.countryName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl">
                                   {config.mapMode === 'usa' ? '🇺🇸' : '🏳️'}
                                </div>
                            )}
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold">{displayEvent.countryName}</h2>
                            <p className="text-sm font-medium text-slate-400 font-mono mt-1">
                                {getFormattedDate(displayEvent)}
                            </p>
                          </div>
                       </div>
                     </div>
                   )}

                   {viewOptions.infoStyle === 'minimal' && (
                     <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-xl shadow-2xl border border-slate-700/50">
                       <div className="text-center py-1">
                            <h2 className="text-2xl font-bold">{displayEvent.countryName}</h2>
                            <p className="text-sm font-medium text-slate-400 font-mono mt-1">
                                {getFormattedDate(displayEvent)}
                            </p>
                       </div>
                     </div>
                   )}
                   
                   {viewOptions.infoStyle === '3d-card' && (
                      <div className="flex flex-col items-center" style={{ perspective: '1000px' }}>
                        <div 
                          className="relative bg-slate-900/80 border border-slate-500/30 p-6 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center gap-4 backdrop-blur-xl"
                          style={{ transform: 'rotateX(10deg)', transformStyle: 'preserve-3d' }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-2xl pointer-events-none"></div>
                            <div className="absolute inset-0 rounded-2xl border-2 border-white/5 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] pointer-events-none"></div>
                            
                            <div className="w-24 h-16 shadow-2xl rounded-lg overflow-hidden border border-white/10 relative z-10 transform translate-z-10">
                               {getFlagUrl(displayEvent.countryName) ? (
                                    <img 
                                        src={getFlagUrl(displayEvent.countryName)!} 
                                        alt={displayEvent.countryName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-3xl">
                                       {config.mapMode === 'usa' ? '🇺🇸' : '🏳️'}
                                    </div>
                                )}
                            </div>
                            <div className="text-center relative z-10">
                               <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400 drop-shadow-sm tracking-tight">
                                  {displayEvent.countryName.toUpperCase()}
                               </h2>
                               <div className="mt-2 inline-block px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full">
                                   <p className="text-sm font-bold text-blue-200 font-mono tracking-widest">
                                      {getFormattedDate(displayEvent)}
                                   </p>
                               </div>
                            </div>
                        </div>
                     </div>
                   )}
               </div>
           )}

           {viewOptions.infoStyle === 'cinematic' && (
               <div 
                 key={displayEvent.id} 
                 className="absolute top-1/2 left-1/2 z-40 animate-cinematic-enter pointer-events-none"
               >
                 <div className="flex flex-col items-center justify-center">
                    <div className="relative mb-6 group">
                        <div className="absolute -inset-4 bg-blue-500/30 blur-2xl rounded-full opacity-60"></div>
                        <div className="w-56 h-36 bg-slate-800 rounded-lg overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)] border border-slate-600/50 relative z-10">
                            {getFlagUrl(displayEvent.countryName) ? (
                                <img 
                                    src={getFlagUrl(displayEvent.countryName)!} 
                                    alt={displayEvent.countryName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-5xl">
                                   {config.mapMode === 'usa' ? '🇺🇸' : '🏳️'}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="text-center relative z-10">
                       <h1 className="text-6xl font-black text-white tracking-tighter drop-shadow-2xl uppercase" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.8)' }}>
                          {displayEvent.countryName}
                       </h1>
                       <div className="mt-4 flex items-center justify-center gap-3">
                           <div className="h-px w-12 bg-blue-400/50"></div>
                           <p className="text-xl text-blue-200 font-mono tracking-[0.2em] font-bold shadow-black drop-shadow-md">
                              {getFormattedDate(displayEvent)}
                           </p>
                           <div className="h-px w-12 bg-blue-400/50"></div>
                       </div>
                    </div>
                 </div>
               </div>
           )}

           {viewOptions.infoStyle === '3d-worldmap' && (
               <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none perspective-1000">
                  <div 
                     className={`
                        relative flex flex-col items-center justify-center
                        ${isExiting ? 'animate-3d-exit' : 'animate-3d-enter'}
                     `}
                  >
                      {/* 3D Panel */}
                      <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] flex flex-col items-center gap-6 relative overflow-hidden">
                          {/* Gloss Effect */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                          
                          {/* Flag */}
                          <div className="w-64 h-40 rounded-xl overflow-hidden shadow-2xl border border-white/20 relative z-10 transform transition-transform hover:scale-105 duration-500">
                             {getFlagUrl(displayEvent.countryName) ? (
                                <img 
                                    src={getFlagUrl(displayEvent.countryName)!} 
                                    alt={displayEvent.countryName}
                                    className="w-full h-full object-cover"
                                />
                             ) : (
                                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-6xl">
                                   {config.mapMode === 'usa' ? '🇺🇸' : '🏳️'}
                                </div>
                             )}
                             {/* Scanline overlay */}
                             <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] pointer-events-none opacity-20"></div>
                          </div>

                          {/* Info */}
                          <div className="text-center relative z-10">
                              <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 tracking-tight drop-shadow-sm">
                                  {displayEvent.countryName}
                              </h2>
                              <div className="mt-3 inline-flex items-center gap-3 bg-black/30 px-4 py-2 rounded-full border border-white/5">
                                 <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                 <span className="text-emerald-200 font-mono text-lg tracking-widest font-bold">
                                    {getFormattedDate(displayEvent)}
                                 </span>
                              </div>
                          </div>
                      </div>
                  </div>
               </div>
           )}
         </>
      )}

      {/* Counter Overlay */}
      {isUiVisible && viewOptions.showCounter && simulationState === SimulationState.PLAYING && (
        <div className={`absolute ${getCounterPositionClass(viewOptions.counterPosition)} bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-lg p-3 shadow-xl z-30 transition-all duration-500`}>
           <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Progress</div>
           <div className="text-2xl font-bold text-white font-mono text-center">
              {visitedCount} <span className="text-slate-600">/</span> {totalCount}
           </div>
        </div>
      )}
    </div>
  );
};

export default WorldMap;
