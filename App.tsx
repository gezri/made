
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ControlPanel from './components/ControlPanel';
import WorldMap from './components/WorldMap';
import { ExpansionEvent, MapColors, SimulationState, ViewOptions, SimulationConfig } from './types';
import { DEFAULT_COLORS, DEFAULT_CONFIG } from './constants';
import { generateExpansionPlan } from './services/geminiService';

const App: React.FC = () => {
  const [events, setEvents] = useState<ExpansionEvent[]>([]);
  const [colors, setColors] = useState<MapColors>(DEFAULT_COLORS);
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [simulationState, setSimulationState] = useState<SimulationState>(SimulationState.IDLE);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  
  // UI Visibility States
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [viewOptions, setViewOptions] = useState<ViewOptions>({
    showHeader: true,
    showPlanner: true,
    showCounter: true,
    counterPosition: 'top-right',
    showCenterIcon: false,
    showMotionLines: false,
    infoStyle: 'default',
    dateFormat: 'numeric-full',
  });
  const [centerIconUrl, setCenterIconUrl] = useState<string | null>(null);
  const [targetMarkerUrl, setTargetMarkerUrl] = useState<string | null>(null);
  
  // Refs to manage timeouts and prevent race conditions
  const sequenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventsRef = useRef(events); // Ref to access latest events in keydown

  // Update refs
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Simulation Logic (Defined before useEffect to be used in it)
  const stopSimulation = useCallback(() => {
    if (sequenceTimeoutRef.current) clearTimeout(sequenceTimeoutRef.current);
    
    setSimulationState(SimulationState.COMPLETED);
    setCurrentEventId(null);
    
    stopTimeoutRef.current = setTimeout(() => {
        setSimulationState(SimulationState.IDLE);
    }, config.animationSpeed);
  }, [config.animationSpeed]);

  const runSequence = useCallback((index: number) => {
    if (index >= eventsRef.current.length) {
      stopSimulation();
      return;
    }

    const eventToProcess = eventsRef.current[index];
    setCurrentEventId(eventToProcess.id);
    
    const travelDelay = config.animationSpeed; 

    sequenceTimeoutRef.current = setTimeout(() => {
        setEvents(prev => prev.map(e => e.id === eventToProcess.id ? { ...e, isVisited: true } : e));

        sequenceTimeoutRef.current = setTimeout(() => {
            runSequence(index + 1);
        }, config.waitDuration);

    }, travelDelay); 
  }, [config.animationSpeed, config.waitDuration, stopSimulation]);

  const startSimulation = useCallback(() => {
    if (eventsRef.current.length === 0) return;
    
    // Clear any pending stop actions
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    if (sequenceTimeoutRef.current) clearTimeout(sequenceTimeoutRef.current);

    // Reset visited status
    setEvents(prev => prev.map(e => ({ ...e, isVisited: false })));
    setSimulationState(SimulationState.PLAYING);
    setCurrentEventId(null); 
    
    // Start sequence
    runSequence(0);
  }, [runSequence]);

  // Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle UI visibility with 'Home' key
      if (e.key === 'Home') {
        setIsUiVisible(prev => !prev);
      }
      
      // Toggle Play/Stop with 'F2' key
      if (e.code === 'F2') {
         e.preventDefault(); 
         setSimulationState(prevState => {
            if (prevState === SimulationState.IDLE || prevState === SimulationState.COMPLETED) {
               startSimulation();
               return SimulationState.PLAYING; 
            } else if (prevState === SimulationState.PLAYING) {
               stopSimulation();
               return prevState;
            }
            return prevState;
         });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startSimulation, stopSimulation]);

  // Handlers
  const handleColorChange = (key: keyof MapColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const addEvent = (eventData: Omit<ExpansionEvent, 'id' | 'isVisited'>) => {
    const newEvent: ExpansionEvent = {
      ...eventData,
      id: uuidv4(),
      isVisited: false
    };
    setEvents(prev => [...prev, newEvent]);
  };

  const removeEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const clearAllEvents = () => {
    setEvents([]);
  };

  const handleGeneratePlan = async (prompt: string) => {
    const currentYear = new Date().getFullYear();
    const plan = await generateExpansionPlan(prompt, currentYear);
    const newEvents: ExpansionEvent[] = plan.map(item => ({
      id: uuidv4(),
      countryName: item.countryName || 'Unknown',
      year: item.year || currentYear,
      month: item.month || 1,
      day: item.day || 1,
      description: item.description,
      isVisited: false
    }));
    setEvents(prev => [...prev, ...newEvents]);
  };

  // Helper to parse loaded Lua data
  const handleDataLoaded = (data: any) => {
    if (data.colors) setColors(prev => ({...prev, ...data.colors}));
    if (data.config) setConfig(prev => ({...prev, ...data.config}));
    if (data.events) {
       const loadedEvents = data.events.map((e: any) => ({
          id: uuidv4(),
          countryName: e.country,
          year: parseInt(e.startDate.split('-')[0]),
          month: parseInt(e.startDate.split('-')[1]),
          day: parseInt(e.startDate.split('-')[2]),
          endYear: e.endDate ? parseInt(e.endDate.split('-')[0]) : undefined,
          endMonth: e.endDate ? parseInt(e.endDate.split('-')[1]) : undefined,
          endDay: e.endDate ? parseInt(e.endDate.split('-')[2]) : undefined,
          isVisited: false
       }));
       setEvents(loadedEvents);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sequenceTimeoutRef.current) clearTimeout(sequenceTimeoutRef.current);
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    };
  }, []);

  return (
    <div className="flex w-full h-screen overflow-hidden">
      <ControlPanel
        events={events}
        onAddEvent={addEvent}
        onRemoveEvent={removeEvent}
        onClearAllEvents={clearAllEvents}
        colors={colors}
        onColorChange={handleColorChange}
        simulationState={simulationState}
        onStartSimulation={startSimulation}
        onStopSimulation={stopSimulation}
        onGeneratePlan={handleGeneratePlan}
        availableCountries={availableCountries}
        isUiVisible={isUiVisible}
        viewOptions={viewOptions}
        setViewOptions={setViewOptions}
        config={config}
        setConfig={setConfig}
        centerIconUrl={centerIconUrl}
        setCenterIconUrl={setCenterIconUrl}
        targetMarkerUrl={targetMarkerUrl}
        setTargetMarkerUrl={setTargetMarkerUrl}
        onDataLoaded={handleDataLoaded}
      />
      
      <main className="flex-1 relative bg-black">
        <WorldMap
          events={events}
          colors={colors}
          simulationState={simulationState}
          currentEventId={currentEventId}
          onMapReady={setAvailableCountries}
          onAnimationComplete={() => {}}
          isUiVisible={isUiVisible}
          viewOptions={viewOptions}
          config={config}
          centerIconUrl={centerIconUrl}
          targetMarkerUrl={targetMarkerUrl}
        />
        
        {/* Helper text if idle (only if UI is visible) */}
        {isUiVisible && simulationState === SimulationState.IDLE && events.length === 0 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
             <div className="bg-slate-900/80 backdrop-blur p-6 rounded-xl border border-slate-700 max-w-md text-center">
                <h3 className="text-xl font-bold text-white mb-2">3D Expansion Simulator</h3>
                <p className="text-slate-400">Add countries manually or use the AI Planner. Press Start to visualize the orbital journey.</p>
                <div className="flex justify-center gap-4 mt-4 text-xs text-slate-500 font-mono">
                   <span className="bg-slate-800/50 p-2 rounded">Home: Toggle UI</span>
                   <span className="bg-slate-800/50 p-2 rounded">F2: Play/Stop</span>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
