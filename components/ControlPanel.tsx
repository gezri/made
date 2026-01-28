
import React, { useState } from 'react';
import { Play, Square, Plus, Trash2, MapPin, Palette, Wand2, Eye, Layout, Camera, Upload, Download, FileJson, Move, Activity, XCircle, Grid, FolderOpen, X, Globe, Calendar, Clock, ArrowRight, Dice5, Layers, Zap, Sparkles } from 'lucide-react';
import { ExpansionEvent, MapColors, SimulationState, ViewOptions, SimulationConfig, CounterPosition, InfoStyle, MapMode, DateFormat, TrailStyle } from '../types';
import { INITIAL_DATE, MAJOR_CITIES } from '../constants';

interface ControlPanelProps {
  events: ExpansionEvent[];
  onAddEvent: (event: Omit<ExpansionEvent, 'id' | 'isVisited'>) => void;
  onRemoveEvent: (id: string) => void;
  onClearAllEvents: () => void;
  colors: MapColors;
  onColorChange: (key: keyof MapColors, value: string) => void;
  simulationState: SimulationState;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  onGeneratePlan: (prompt: string) => void;
  availableCountries: string[];
  isUiVisible: boolean;
  viewOptions: ViewOptions;
  setViewOptions: React.Dispatch<React.SetStateAction<ViewOptions>>;
  config: SimulationConfig;
  setConfig: React.Dispatch<React.SetStateAction<SimulationConfig>>;
  centerIconUrl: string | null;
  setCenterIconUrl: (url: string | null) => void;
  targetMarkerUrl: string | null;
  setTargetMarkerUrl: (url: string | null) => void;
  onDataLoaded: (data: any) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  events,
  onAddEvent,
  onRemoveEvent,
  onClearAllEvents,
  colors,
  onColorChange,
  simulationState,
  onStartSimulation,
  onStopSimulation,
  onGeneratePlan,
  availableCountries,
  isUiVisible,
  viewOptions,
  setViewOptions,
  config,
  setConfig,
  centerIconUrl,
  setCenterIconUrl,
  targetMarkerUrl,
  setTargetMarkerUrl,
  onDataLoaded
}) => {
  const [startDate, setStartDate] = useState(INITIAL_DATE);
  const [endDate, setEndDate] = useState(INITIAL_DATE);
  const [dateMode, setDateMode] = useState<'specific' | 'relative'>('specific');
  const [relativeInterval, setRelativeInterval] = useState({ years: 0, months: 1, days: 0 });
  const [countryInput, setCountryInput] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'add' | 'design' | 'ai'>('add');

  // If UI is globally hidden via 'Home' key, return null
  if (!isUiVisible) return null;

  // Fuzzy search / Suggestion for countries AND Cities
  const filteredCountries = countryInput
    ? [
        // Match cities first
        ...MAJOR_CITIES
           .filter(c => c.name.toLowerCase().includes(countryInput.toLowerCase()))
           .map(c => c.name),
        // Then countries/states
        ...availableCountries
           .filter(c => c.toLowerCase().includes(countryInput.toLowerCase()))
      ].slice(0, 5)
    : [];

  const handleRandomLocation = () => {
    // Priority: Random City
    if (MAJOR_CITIES.length > 0) {
        const randomCity = MAJOR_CITIES[Math.floor(Math.random() * MAJOR_CITIES.length)];
        setCountryInput(randomCity.name);
    } else if (availableCountries.length > 0) {
        const randomCountry = availableCountries[Math.floor(Math.random() * availableCountries.length)];
        setCountryInput(randomCountry);
    }
  };

  const handleAdd = () => {
    if (!countryInput) return;
    const cleanInput = countryInput.trim();

    let targetStart = { ...startDate };
    let targetEnd = { ...endDate };

    if (dateMode === 'relative') {
         const lastEvent = events[events.length - 1];
         // Base date is the end of the last event, or start if no end, or user's startDate input if no events
         let baseDate = lastEvent 
             ? { year: lastEvent.endYear || lastEvent.year, month: lastEvent.endMonth || lastEvent.month, day: lastEvent.endDay || lastEvent.day } 
             : startDate;
        
         const d = new Date(baseDate.year, baseDate.month - 1, baseDate.day);
         d.setFullYear(d.getFullYear() + relativeInterval.years);
         d.setMonth(d.getMonth() + relativeInterval.months);
         d.setDate(d.getDate() + relativeInterval.days);

         targetStart = {
             year: d.getFullYear(),
             month: d.getMonth() + 1,
             day: d.getDate()
         };
         // For relative, we default end date to same as start unless complex duration logic is added
         targetEnd = { ...targetStart };
    }

    // Check if input matches a known city to attach coordinates
    const cityData = MAJOR_CITIES.find(c => c.name.toLowerCase() === cleanInput.toLowerCase());
    
    onAddEvent({
      countryName: cleanInput,
      year: targetStart.year,
      month: targetStart.month,
      day: targetStart.day,
      endYear: targetEnd.year,
      endMonth: targetEnd.month,
      endDay: targetEnd.day,
      description: 'Expansion target',
      coordinates: cityData ? cityData.coords : undefined
    });
    setCountryInput('');
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt) return;
    setIsAiLoading(true);
    await onGeneratePlan(aiPrompt);
    setIsAiLoading(false);
    setAiPrompt('');
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setter(url);
    }
  };

  const parseLuaContent = (content: string) => {
      const result: any = { colors: {}, config: {}, events: [] };
      
      const bgMatch = content.match(/background = "(.*?)"/);
      if (bgMatch) result.colors.background = bgMatch[1];
      const visitedMatch = content.match(/visited = "(.*?)"/);
      if (visitedMatch) result.colors.visited = visitedMatch[1];
      const unvisitedMatch = content.match(/unvisited = "(.*?)"/);
      if (unvisitedMatch) result.colors.unvisited = unvisitedMatch[1];
      const strokeMatch = content.match(/stroke = "(.*?)"/);
      if (strokeMatch) result.colors.stroke = strokeMatch[1];
      const trailMatch = content.match(/trail = "(.*?)"/);
      if (trailMatch) result.colors.trail = trailMatch[1];
      const flashMatch = content.match(/flash = "(.*?)"/);
      if (flashMatch) result.colors.flash = flashMatch[1];

      const zoomInMatch = content.match(/zoomInMultiplier = ([\d\.]+)/);
      if (zoomInMatch) result.config.zoomInMultiplier = parseFloat(zoomInMatch[1]);
      const zoomOutMatch = content.match(/zoomOutScale = ([\d\.]+)/);
      if (zoomOutMatch) result.config.zoomOutScale = parseFloat(zoomOutMatch[1]);
      const animSpeedMatch = content.match(/animationSpeed = ([\d\.]+)/);
      if (animSpeedMatch) result.config.animationSpeed = parseFloat(animSpeedMatch[1]);
      const waitMatch = content.match(/waitDuration = ([\d\.]+)/);
      if (waitMatch) result.config.waitDuration = parseFloat(waitMatch[1]);
      const flashDurMatch = content.match(/flashDuration = ([\d\.]+)/);
      if (flashDurMatch) result.config.flashDuration = parseFloat(flashDurMatch[1]);

      const centerScaleMatch = content.match(/centerIconScale = ([\d\.]+)/);
      if (centerScaleMatch) result.config.centerIconScale = parseFloat(centerScaleMatch[1]);
      const targetScaleMatch = content.match(/targetMarkerScale = ([\d\.]+)/);
      if (targetScaleMatch) result.config.targetMarkerScale = parseFloat(targetScaleMatch[1]);
      const lineWidthMatch = content.match(/lineWidth = ([\d\.]+)/);
      if (lineWidthMatch) result.config.lineWidth = parseFloat(lineWidthMatch[1]);
      const modeMatch = content.match(/mapMode = "(.*?)"/);
      if (modeMatch) result.config.mapMode = modeMatch[1] as MapMode;

      const eventRegex = /\{\s*country = "(.*?)",\s*startDate = "(.*?)",\s*(?:endDate = "(.*?)",)?\s*\}/g;
      let match;
      while ((match = eventRegex.exec(content)) !== null) {
          result.events.push({
              country: match[1],
              startDate: match[2],
              endDate: match[3]
          });
      }

      return result;
  };

  const handleLoadLua = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const content = event.target?.result as string;
          if (content) {
              const parsed = parseLuaContent(content);
              onDataLoaded(parsed);
          }
      };
      reader.readAsText(file);
  };

  const handleSaveLua = () => {
    let luaContent = 'return {\n';
    
    luaContent += '  colors = {\n';
    luaContent += `    background = "${colors.background}",\n`;
    luaContent += `    visited = "${colors.visited}",\n`;
    luaContent += `    unvisited = "${colors.unvisited}",\n`;
    luaContent += `    stroke = "${colors.stroke}",\n`;
    luaContent += `    trail = "${colors.trail}",\n`;
    luaContent += `    flash = "${colors.flash || '#ffffff'}"\n`;
    luaContent += '  },\n';

    luaContent += '  config = {\n';
    luaContent += `    zoomInMultiplier = ${config.zoomInMultiplier},\n`;
    luaContent += `    zoomOutScale = ${config.zoomOutScale},\n`;
    luaContent += `    animationSpeed = ${config.animationSpeed},\n`;
    luaContent += `    waitDuration = ${config.waitDuration},\n`;
    luaContent += `    flashDuration = ${config.flashDuration || 1200},\n`;
    luaContent += `    centerIconScale = ${config.centerIconScale},\n`;
    luaContent += `    targetMarkerScale = ${config.targetMarkerScale},\n`;
    luaContent += `    lineWidth = ${config.lineWidth},\n`;
    luaContent += `    mapMode = "${config.mapMode}"\n`;
    luaContent += '  },\n';

    luaContent += '  events = {\n';
    events.forEach(e => {
        luaContent += '    {\n';
        luaContent += `      country = "${e.countryName}",\n`;
        luaContent += `      startDate = "${e.year}-${e.month}-${e.day}",\n`;
        if (e.endYear) {
            luaContent += `      endDate = "${e.endYear}-${e.endMonth}-${e.endDay}",\n`;
        }
        luaContent += '    },\n';
    });
    luaContent += '  }\n';
    luaContent += '}\n';

    const blob = new Blob([luaContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expansion_plan.lua';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const DateInputs = ({ label, date, setDate }: { label: string, date: typeof INITIAL_DATE, setDate: any }) => (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="flex gap-1">
        <input
          type="number"
          placeholder="YYYY"
          value={date.year}
          onChange={(e) => setDate({ ...date, year: parseInt(e.target.value) || 2024 })}
          className="w-[38%] bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
        />
        <select
          value={date.month}
          onChange={(e) => setDate({ ...date, month: parseInt(e.target.value) })}
          className="w-[34%] bg-slate-800 border border-slate-700 rounded px-1 py-1.5 text-xs focus:border-blue-500 outline-none"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'short' })}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="DD"
          min="1"
          max="31"
          value={date.day}
          onChange={(e) => setDate({ ...date, day: parseInt(e.target.value) || 1 })}
          className="w-[28%] bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
        />
      </div>
    </div>
  );

  return (
    <div className="w-80 h-full bg-slate-900 border-r border-slate-800 flex flex-col shadow-xl z-20">
      
      {/* Header Section */}
      {viewOptions.showHeader && (
        <div className="p-4 border-b border-slate-800 bg-slate-950">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            {config.mapMode === 'usa' ? 'USA Expansion' : 'Global Expansion'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">Visualize growth in 3D</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('add')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'add' ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'
          }`}
        >
          Plan
        </button>
        <button
          onClick={() => setActiveTab('design')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'design' ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'
          }`}
        >
          Design
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'ai' ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'
          }`}
        >
          AI
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* ADD TAB */}
        {activeTab === 'add' && (
          <div className="space-y-4">
            
            {/* Planner UI */}
            {viewOptions.showPlanner ? (
              <>
                {/* Date Mode Toggle */}
                <div className="flex bg-slate-800 p-0.5 rounded-lg mb-2">
                   <button 
                     onClick={() => setDateMode('specific')}
                     className={`flex-1 text-[10px] uppercase font-bold py-1.5 rounded-md transition-all ${dateMode === 'specific' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     Menu Year/Month/Day
                   </button>
                   <button 
                     onClick={() => setDateMode('relative')}
                     className={`flex-1 text-[10px] uppercase font-bold py-1.5 rounded-md transition-all ${dateMode === 'relative' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     Select by Add Count
                   </button>
                </div>

                {dateMode === 'specific' ? (
                  <>
                    <DateInputs label="Date Start" date={startDate} setDate={setStartDate} />
                    <DateInputs label="Date End" date={endDate} setDate={setEndDate} />
                  </>
                ) : (
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Clock size={10} /> Add Interval (Count)
                     </label>
                     <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-800 rounded px-2 py-1.5 border border-slate-700">
                           <input 
                             type="number" 
                             min="0"
                             value={relativeInterval.years}
                             onChange={(e) => setRelativeInterval(p => ({...p, years: parseInt(e.target.value) || 0}))}
                             className="w-full bg-transparent text-center text-xs font-bold outline-none"
                           />
                           <div className="text-[9px] text-slate-500 text-center uppercase mt-1">Years</div>
                        </div>
                        <div className="bg-slate-800 rounded px-2 py-1.5 border border-slate-700">
                           <input 
                             type="number" 
                             min="0"
                             value={relativeInterval.months}
                             onChange={(e) => setRelativeInterval(p => ({...p, months: parseInt(e.target.value) || 0}))}
                             className="w-full bg-transparent text-center text-xs font-bold outline-none"
                           />
                           <div className="text-[9px] text-slate-500 text-center uppercase mt-1">Months</div>
                        </div>
                        <div className="bg-slate-800 rounded px-2 py-1.5 border border-slate-700">
                           <input 
                             type="number" 
                             min="0"
                             value={relativeInterval.days}
                             onChange={(e) => setRelativeInterval(p => ({...p, days: parseInt(e.target.value) || 0}))}
                             className="w-full bg-transparent text-center text-xs font-bold outline-none"
                           />
                           <div className="text-[9px] text-slate-500 text-center uppercase mt-1">Days</div>
                        </div>
                     </div>
                  </div>
                )}

                <div className="space-y-2 relative pt-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                     Target Location
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type city, country or state..."
                      value={countryInput}
                      onChange={(e) => setCountryInput(e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                    />
                    <button
                      onClick={handleRandomLocation}
                      className="bg-slate-700 hover:bg-slate-600 text-slate-200 rounded p-2 transition-colors border border-slate-600"
                      title="Random City"
                    >
                      <Dice5 size={18} />
                    </button>
                    <button
                      onClick={handleAdd}
                      disabled={!countryInput}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded p-2 transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  {/* Suggestions */}
                  {countryInput && filteredCountries.length > 0 && (
                    <div className="absolute top-full left-0 right-12 mt-1 bg-slate-800 border border-slate-700 rounded shadow-lg z-50 max-h-40 overflow-y-auto">
                      {filteredCountries.map(c => (
                        <div
                          key={c}
                          onClick={() => setCountryInput(c)}
                          className="px-3 py-2 text-sm hover:bg-slate-700 cursor-pointer"
                        >
                          {c}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                     <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scheduled Events</label>
                     {events.length > 0 && (
                        <button 
                           onClick={onClearAllEvents}
                           className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                           <XCircle size={10} /> Clear All
                        </button>
                     )}
                  </div>
                  
                  <div className="relative space-y-2">
                    {/* Visual Line connecting events (Timeline style) */}
                    {events.length > 1 && (
                        <div 
                           className="absolute left-[13px] top-4 bottom-4 w-0.5 z-0"
                           style={{ backgroundColor: colors.stroke, opacity: 0.3 }}
                        />
                    )}
                    
                    {events.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-slate-800 rounded">
                        No expansion events added yet.
                      </div>
                    ) : (
                      events.map((event, idx) => (
                        <div key={event.id} className="relative bg-slate-800/50 border border-slate-700 rounded p-2 flex items-center justify-between group z-10">
                          <div className="flex items-center gap-3 overflow-hidden">
                             <div 
                                className="w-7 h-7 flex flex-shrink-0 items-center justify-center rounded-full text-xs font-bold border-2"
                                style={{ 
                                    backgroundColor: colors.unvisited, 
                                    borderColor: event.isVisited ? colors.visited : colors.stroke,
                                    color: event.isVisited ? colors.visited : '#94a3b8' 
                                }}
                             >
                               {idx + 1}
                             </div>
                             <div className="min-w-0">
                               <div className="text-sm font-medium truncate">{event.countryName}</div>
                               <div className="text-xs text-slate-400">
                                {event.year}-{event.month}-{event.day}
                                {event.endYear ? ` → ${event.endYear}-${event.endMonth}-${event.endDay}` : ''}
                               </div>
                             </div>
                          </div>
                          <button
                            onClick={() => onRemoveEvent(event.id)}
                            className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 border border-dashed border-slate-800 rounded text-center text-slate-500 text-sm">
                Planner UI hidden via Design settings.
              </div>
            )}
          </div>
        )}

        {/* DESIGN TAB */}
        {activeTab === 'design' && (
          <div className="space-y-6">
             {/* GROW & LAYERING CONFIG */}
             <div className="space-y-3 pb-6 border-b border-slate-800">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                   <Layers size={14} /> Grow & Layering
                </label>

                {/* Motion Lines Config */}
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-300 flex items-center gap-2">
                           <Activity size={12} /> Trails (Motion Lines)
                        </span>
                        {/* Enable/Disable Toggle */}
                        <label className="relative inline-flex items-center cursor-pointer">
                           <input 
                              type="checkbox" 
                              checked={viewOptions.showMotionLines} 
                              onChange={(e) => setViewOptions(prev => ({...prev, showMotionLines: e.target.checked}))}
                              className="sr-only peer" 
                           />
                           <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[0px] after:start-[0px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {viewOptions.showMotionLines && (
                        <div className="space-y-3 pt-2 border-t border-slate-700/50">
                            {/* Trail Style Selector */}
                            <div className="space-y-1.5">
                                <div className="text-[10px] text-slate-500 flex items-center gap-1 uppercase font-bold tracking-tight">
                                    <Zap size={10} /> Style
                                </div>
                                <div className="grid grid-cols-3 gap-1 bg-slate-900 rounded p-1 border border-slate-700">
                                    <button 
                                        onClick={() => setViewOptions(prev => ({...prev, trailStyle: 'static'}))}
                                        className={`py-1.5 text-[10px] rounded font-bold transition-all ${viewOptions.trailStyle === 'static' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Static
                                    </button>
                                    <button 
                                        onClick={() => setViewOptions(prev => ({...prev, trailStyle: 'grow'}))}
                                        className={`py-1.5 text-[10px] rounded font-bold transition-all ${viewOptions.trailStyle === 'grow' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Grow
                                    </button>
                                    <button 
                                        onClick={() => setViewOptions(prev => ({...prev, trailStyle: 'rainbow'}))}
                                        className={`py-1.5 text-[10px] rounded font-bold transition-all ${viewOptions.trailStyle === 'rainbow' ? 'bg-gradient-to-r from-red-500 via-green-500 to-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Rainbow
                                    </button>
                                </div>
                            </div>

                            {/* Layer Selector */}
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Render Layer</span>
                                <div className="flex bg-slate-900 rounded p-0.5 border border-slate-700">
                                   <button 
                                      onClick={() => setViewOptions(prev => ({...prev, layerConfig: {...prev.layerConfig, trails: 'base'}}))}
                                      className={`px-3 py-1 text-[10px] rounded transition-colors font-bold ${viewOptions.layerConfig?.trails === 'base' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                   >
                                      Base
                                   </button>
                                   <button 
                                      onClick={() => setViewOptions(prev => ({...prev, layerConfig: {...prev.layerConfig, trails: 'atmosphere'}}))}
                                      className={`px-3 py-1 text-[10px] rounded transition-colors font-bold ${viewOptions.layerConfig?.trails === 'atmosphere' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                   >
                                      Atmosphere
                                   </button>
                                </div>
                            </div>
                             {/* Color Picker (Only show if not rainbow) */}
                             {viewOptions.trailStyle !== 'rainbow' && (
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Trail Color</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-500 font-mono">{colors.trail || '#ffffff'}</span>
                                        <input
                                            type="color"
                                            value={colors.trail || '#ffffff'}
                                            onChange={(e) => onColorChange('trail', e.target.value)}
                                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                                        />
                                    </div>
                                </div>
                             )}
                        </div>
                    )}
                </div>

                {/* Visited Maps Config */}
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-300 flex items-center gap-2">
                           <Globe size={12} /> Visited Map (Grow)
                        </span>
                    </div>

                    <div className="space-y-4 pt-2 border-t border-slate-700/50">
                         {/* Layer Selector */}
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Render Layer</span>
                            <div className="flex bg-slate-900 rounded p-0.5 border border-slate-700">
                                <button 
                                    onClick={() => setViewOptions(prev => ({...prev, layerConfig: {...prev.layerConfig, visited: 'base'}}))}
                                    className={`px-3 py-1 text-[10px] rounded transition-colors font-bold ${viewOptions.layerConfig?.visited === 'base' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Base
                                </button>
                                <button 
                                    onClick={() => setViewOptions(prev => ({...prev, layerConfig: {...prev.layerConfig, visited: 'atmosphere'}}))}
                                    className={`px-3 py-1 text-[10px] rounded transition-colors font-bold ${viewOptions.layerConfig?.visited === 'atmosphere' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Atmosphere
                                </button>
                            </div>
                        </div>
                         {/* Color Picker */}
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Grow Color</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 font-mono">{colors.visited}</span>
                                <input
                                    type="color"
                                    value={colors.visited}
                                    onChange={(e) => onColorChange('visited', e.target.value)}
                                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                                />
                            </div>
                         </div>

                         {/* Fade Flash White Config */}
                         <div className="space-y-3 pt-3 border-t border-slate-800/30">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight flex items-center gap-1">
                                    <Sparkles size={10} /> Flash Color
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-500 font-mono">{colors.flash || '#ffffff'}</span>
                                    <input
                                        type="color"
                                        value={colors.flash || '#ffffff'}
                                        onChange={(e) => onColorChange('flash', e.target.value)}
                                        className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] text-slate-500 flex justify-between">
                                    <span>Flash Duration</span>
                                    <span>{config.flashDuration}ms</span>
                                </div>
                                <input 
                                  type="range"
                                  min="0"
                                  max="3000"
                                  step="100"
                                  value={config.flashDuration}
                                  onChange={(e) => setConfig(prev => ({ ...prev, flashDuration: parseInt(e.target.value) }))}
                                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                         </div>
                    </div>
                </div>
             </div>

             {/* VIEW SETTINGS */}
             <div className="space-y-3 pb-6 border-b border-slate-800">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Eye size={14} /> View Settings
                </label>
                
                <div className="space-y-3">
                   {/* Info Overlay Style */}
                   <div className="space-y-1">
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                         <Layout size={10} /> Info Overlay Style
                      </div>
                      <select 
                         value={viewOptions.infoStyle}
                         onChange={(e) => setViewOptions(prev => ({ ...prev, infoStyle: e.target.value as InfoStyle }))}
                         className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 focus:border-blue-500 outline-none"
                      >
                         <option value="default">Default (Side by Side)</option>
                         <option value="flag-center">Flag Center (Box)</option>
                         <option value="cinematic">Cinematic (Flag & Name Fade)</option>
                         <option value="minimal">Minimal (No Flag)</option>
                         <option value="3d-card">3D Floating Card</option>
                      </select>
                   </div>

                   {/* Date Format Channel */}
                   <div className="space-y-1">
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                         <Calendar size={10} /> Date Format Channel
                      </div>
                      <select 
                         value={viewOptions.dateFormat || 'numeric-full'}
                         onChange={(e) => setViewOptions(prev => ({ ...prev, dateFormat: e.target.value as DateFormat }))}
                         className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 focus:border-blue-500 outline-none"
                      >
                         <option value="number-name">1. Number and Name (e.g. 01 January)</option>
                         <option value="numeric-full">2. Both (e.g. 2024.01.01)</option>
                         <option value="month-name">3. Month with Name (e.g. January 2024)</option>
                      </select>
                   </div>

                   {/* Count Box */}
                   <div className="space-y-1">
                       <label className="flex items-center justify-between cursor-pointer group mb-1">
                          <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Show Count Box</span>
                          <input 
                            type="checkbox" 
                            checked={viewOptions.showCounter} 
                            onChange={(e) => setViewOptions(prev => ({...prev, showCounter: e.target.checked}))}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                          />
                       </label>
                       {viewOptions.showCounter && (
                          <div className="pl-2 border-l border-slate-700 ml-1">
                             <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                                <Grid size={10} /> Position
                             </div>
                             <select 
                                value={viewOptions.counterPosition}
                                onChange={(e) => setViewOptions(prev => ({ ...prev, counterPosition: e.target.value as CounterPosition }))}
                                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 focus:border-blue-500 outline-none"
                             >
                                <option value="top-left">1. Top Left</option>
                                <option value="center-left">2. Center Left</option>
                                <option value="bottom-left">3. Bottom Left</option>
                                <option value="bottom-center">4. Bottom Center</option>
                                <option value="bottom-right">5. Bottom Right</option>
                                <option value="center-right">6. Center Right</option>
                                <option value="top-right">7. Top Right</option>
                                <option value="top-center">8. Top Center</option>
                             </select>
                          </div>
                       )}
                   </div>

                   {/* Target Marker Config */}
                   <div className="space-y-3 pt-3 border-t border-slate-800/50">
                      <div className="text-xs font-medium text-slate-300 flex items-center gap-2">
                        <MapPin size={12} /> Target Indicators
                      </div>
                      
                      <div className="bg-slate-800/50 rounded p-2 space-y-3 border border-slate-800">
                          {/* Custom Target Icon */}
                          <div className="flex items-center gap-2">
                             <label className="flex-1 cursor-pointer bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 py-1.5 px-2 rounded border border-slate-700 text-center transition-colors flex items-center justify-center gap-2">
                                <Upload size={12} />
                                {targetMarkerUrl ? 'Change Marker' : 'Upload Marker Icon'}
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onClick={(e) => (e.target as HTMLInputElement).value = ''} 
                                  onChange={(e) => handleIconUpload(e, setTargetMarkerUrl)} 
                                  className="hidden" 
                                />
                             </label>
                             {targetMarkerUrl && (
                               <>
                                 <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 p-0.5">
                                   <img src={targetMarkerUrl} alt="Target" className="w-full h-full object-contain" />
                                 </div>
                                 <button
                                    onClick={() => setTargetMarkerUrl(null)}
                                    className="bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 p-2 rounded border border-slate-700 transition-colors"
                                    title="Clear Marker"
                                  >
                                    <X size={14} />
                                  </button>
                               </>
                             )}
                          </div>
                          {/* Target Marker Size Slider */}
                          <div className="space-y-1">
                            <div className="text-[10px] text-slate-500 flex justify-between">
                                <span>Marker Size</span>
                                <span>{config.targetMarkerScale.toFixed(1)}x</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Move size={12} className="text-slate-500" />
                                <input 
                                  type="range"
                                  min="0.2"
                                  max="3.0"
                                  step="0.1"
                                  value={config.targetMarkerScale}
                                  onChange={(e) => setConfig(prev => ({ ...prev, targetMarkerScale: parseFloat(e.target.value) }))}
                                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                          </div>
                      </div>
                   </div>

                   {/* Static Center Icon */}
                   <div className="space-y-1 border-t border-slate-800/50 pt-2">
                      <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Static Center Icon</span>
                        <input 
                          type="checkbox" 
                          checked={viewOptions.showCenterIcon} 
                          onChange={(e) => setViewOptions(prev => ({...prev, showCenterIcon: e.target.checked}))}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                      
                      {viewOptions.showCenterIcon && (
                        <div className="bg-slate-800/50 rounded p-2 space-y-3 border border-slate-800 ml-1">
                          <div className="flex items-center gap-2">
                             <label className="flex-1 cursor-pointer bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 py-1.5 px-2 rounded border border-slate-700 text-center transition-colors flex items-center justify-center gap-2">
                                <Upload size={12} />
                                {centerIconUrl ? 'Change' : 'Upload'}
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onClick={(e) => (e.target as HTMLInputElement).value = ''} 
                                  onChange={(e) => handleIconUpload(e, setCenterIconUrl)} 
                                  className="hidden" 
                                />
                             </label>
                             {centerIconUrl && (
                                <button
                                   onClick={() => setCenterIconUrl(null)}
                                   className="bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 p-2 rounded border border-slate-700 transition-colors"
                                   title="Clear Icon"
                                >
                                  <X size={14} />
                                </button>
                             )}
                          </div>
                          {/* Size Slider */}
                          <div className="flex items-center gap-2">
                            <Move size={12} className="text-slate-500" />
                            <input 
                              type="range"
                              min="0.2"
                              max="3.0"
                              step="0.1"
                              value={config.centerIconScale}
                              onChange={(e) => setConfig(prev => ({ ...prev, centerIconScale: parseFloat(e.target.value) }))}
                              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                   </div>
                </div>
             </div>

             {/* CAMERA CONFIG */}
             <div className="space-y-3 pb-6 border-b border-slate-800">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Camera size={14} /> Camera Config
                </label>
                
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                      <div className="text-[10px] text-slate-500">Zoom In (Focus)</div>
                      <input 
                        type="number"
                        step="0.1"
                        min="1"
                        max="10"
                        value={config.zoomInMultiplier}
                        onChange={(e) => setConfig(prev => ({ ...prev, zoomInMultiplier: parseFloat(e.target.value) || 2.5 }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
                      />
                   </div>
                   <div className="space-y-1">
                      <div className="text-[10px] text-slate-500">Zoom Out (Base)</div>
                      <input 
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="3"
                        value={config.zoomOutScale}
                        onChange={(e) => setConfig(prev => ({ ...prev, zoomOutScale: parseFloat(e.target.value) || 1.0 }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
                      />
                   </div>
                   <div className="space-y-1">
                      <div className="text-[10px] text-slate-500">Anim Speed (ms)</div>
                      <input 
                        type="number"
                        step="100"
                        min="500"
                        value={config.animationSpeed}
                        onChange={(e) => setConfig(prev => ({ ...prev, animationSpeed: parseInt(e.target.value) || 2500 }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
                      />
                   </div>
                   <div className="space-y-1">
                      <div className="text-[10px] text-slate-500">Wait Time (ms)</div>
                      <input 
                        type="number"
                        step="100"
                        min="0"
                        value={config.waitDuration}
                        onChange={(e) => setConfig(prev => ({ ...prev, waitDuration: parseInt(e.target.value) || 2000 }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
                      />
                   </div>
                </div>

                {/* Motion Line Width */}
                {viewOptions.showMotionLines && (
                    <div className="space-y-1 pt-2 border-t border-slate-800/50">
                        <div className="text-[10px] text-slate-500 flex justify-between">
                            <span>Motion Line Width</span>
                            <span>{config.lineWidth || 2.5}px</span>
                        </div>
                        <input 
                           type="range"
                           min="0.5"
                           max="10.0"
                           step="0.5"
                           value={config.lineWidth || 2.5}
                           onChange={(e) => setConfig(prev => ({ ...prev, lineWidth: parseFloat(e.target.value) }))}
                           className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                )}
             </div>

             {/* COLOR CONFIG */}
             <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Palette size={14} /> Global Colors
              </label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Ocean / Background</span>
                  <div className="flex items-center gap-2">
                     <span className="text-xs text-slate-500 font-mono">{colors.background}</span>
                     <input
                        type="color"
                        value={colors.background}
                        onChange={(e) => onColorChange('background', e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                     />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-sm text-slate-300">Unselected Locations</span>
                   <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-mono">{colors.unvisited}</span>
                      <input
                        type="color"
                        value={colors.unvisited}
                        onChange={(e) => onColorChange('unvisited', e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                     />
                   </div>
                </div>
              </div>
             </div>
          </div>
        )}

        {/* AI TAB */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
             <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Wand2 size={14} /> AI Planner
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., Plan an aggressive expansion..."
                className="w-full h-32 bg-slate-800 border border-slate-700 rounded p-3 text-sm focus:border-blue-500 outline-none resize-none"
              />
              <button
                onClick={handleAiGenerate}
                disabled={isAiLoading || !aiPrompt}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded py-2 flex items-center justify-center gap-2 transition-colors"
              >
                {isAiLoading ? 'Generating...' : 'Generate Plan'}
                {!isAiLoading && <Wand2 size={16} />}
              </button>
              <p className="text-xs text-slate-500 leading-relaxed">
                Powered by Gemini.
              </p>
          </div>
        )}
      </div>

      {/* FOOTER CONTROLS */}
      <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3">
        {(activeTab === 'add' || activeTab === 'design') && (
            <div className="flex gap-2">
                <button
                  onClick={handleSaveLua}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded flex items-center justify-center gap-2 transition-colors border border-slate-700"
                >
                  <FileJson size={14} /> Save Lua
                </button>
                <label className="flex-1 cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded flex items-center justify-center gap-2 transition-colors border border-slate-700 flex items-center justify-center">
                    <FolderOpen size={14} className="mr-2" /> Load Lua
                    <input type="file" accept=".lua,.txt" onChange={handleLoadLua} className="hidden" />
                </label>
            </div>
        )}

        {simulationState === SimulationState.PLAYING ? (
          <button
            onClick={onStopSimulation}
            className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-900/20"
          >
            <Square fill="currentColor" size={16} /> Force Stop
          </button>
        ) : (
          <button
            onClick={onStartSimulation}
            disabled={events.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white py-3 rounded font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
          >
            <Play fill="currentColor" size={16} /> Start Simulator
          </button>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
