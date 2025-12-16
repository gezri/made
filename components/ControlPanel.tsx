
import React, { useState } from 'react';
import { Play, Square, Plus, Trash2, MapPin, Palette, Wand2, Eye, Layout, Camera, Upload, Download, FileJson, Move, Activity, XCircle, Grid, FolderOpen, X, Globe, Calendar } from 'lucide-react';
import { ExpansionEvent, MapColors, SimulationState, ViewOptions, SimulationConfig, CounterPosition, InfoStyle, MapMode, DateFormat } from '../types';
import { INITIAL_DATE } from '../constants';

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
  const [countryInput, setCountryInput] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'add' | 'design' | 'ai'>('add');

  // If UI is globally hidden via 'Home' key, return null
  if (!isUiVisible) return null;

  // Fuzzy search / Suggestion for countries
  const filteredCountries = countryInput
    ? availableCountries
        .filter(c => c.toLowerCase().includes(countryInput.toLowerCase()))
        .slice(0, 5)
    : [];

  const handleAdd = () => {
    if (!countryInput) return;
    onAddEvent({
      countryName: countryInput,
      year: startDate.year,
      month: startDate.month,
      day: startDate.day,
      endYear: endDate.year,
      endMonth: endDate.month,
      endDay: endDate.day,
      description: 'Expansion target',
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

      const zoomInMatch = content.match(/zoomInMultiplier = ([\d\.]+)/);
      if (zoomInMatch) result.config.zoomInMultiplier = parseFloat(zoomInMatch[1]);
      const zoomOutMatch = content.match(/zoomOutScale = ([\d\.]+)/);
      if (zoomOutMatch) result.config.zoomOutScale = parseFloat(zoomOutMatch[1]);
      const animSpeedMatch = content.match(/animationSpeed = ([\d\.]+)/);
      if (animSpeedMatch) result.config.animationSpeed = parseFloat(animSpeedMatch[1]);
      const waitMatch = content.match(/waitDuration = ([\d\.]+)/);
      if (waitMatch) result.config.waitDuration = parseFloat(waitMatch[1]);
      const centerScaleMatch = content.match(/centerIconScale = ([\d\.]+)/);
      if (centerScaleMatch) result.config.centerIconScale = parseFloat(centerScaleMatch[1]);
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
    luaContent += `    trail = "${colors.trail}"\n`;
    luaContent += '  },\n';

    luaContent += '  config = {\n';
    luaContent += `    zoomInMultiplier = ${config.zoomInMultiplier},\n`;
    luaContent += `    zoomOutScale = ${config.zoomOutScale},\n`;
    luaContent += `    animationSpeed = ${config.animationSpeed},\n`;
    luaContent += `    waitDuration = ${config.waitDuration},\n`;
    luaContent += `    centerIconScale = ${config.centerIconScale},\n`;
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
            
            {/* Map Mode Toggle */}
            <div className="p-1 bg-slate-800 rounded-lg flex gap-1 mb-4 border border-slate-700">
               <button
                  onClick={() => {
                     setConfig(prev => ({...prev, mapMode: 'world'}));
                     onClearAllEvents();
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded transition-all flex items-center justify-center gap-1 ${
                    config.mapMode === 'world' 
                       ? 'bg-blue-600 text-white shadow-lg' 
                       : 'text-slate-400 hover:text-slate-200'
                  }`}
               >
                  <Globe size={12} /> Global
               </button>
               <button
                  onClick={() => {
                     setConfig(prev => ({...prev, mapMode: 'usa'}));
                     onClearAllEvents();
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded transition-all flex items-center justify-center gap-1 ${
                    config.mapMode === 'usa' 
                       ? 'bg-blue-600 text-white shadow-lg' 
                       : 'text-slate-400 hover:text-slate-200'
                  }`}
               >
                  <MapPin size={12} /> USA (50 States)
               </button>
            </div>

            {/* Planner UI */}
            {viewOptions.showPlanner ? (
              <>
                <DateInputs label="Date Start" date={startDate} setDate={setStartDate} />
                <DateInputs label="Date End" date={endDate} setDate={setEndDate} />

                <div className="space-y-2 relative pt-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                     {config.mapMode === 'usa' ? 'Target State' : 'Target Country'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={config.mapMode === 'usa' ? "Type state name..." : "Type country name..."}
                      value={countryInput}
                      onChange={(e) => setCountryInput(e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                    />
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
                  
                  <div className="space-y-2">
                    {events.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-slate-800 rounded">
                        No expansion events added yet.
                      </div>
                    ) : (
                      events.map((event, idx) => (
                        <div key={event.id} className="bg-slate-800/50 border border-slate-700 rounded p-2 flex items-center justify-between group">
                          <div className="flex items-center gap-3 overflow-hidden">
                             <div className="w-6 h-6 flex items-center justify-center bg-slate-700 rounded-full text-xs font-bold text-slate-300">
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
                         <option value="3d-worldmap">3D Worldmap (Close & Open)</option>
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
                          {/* Motion Lines Toggle */}
                          <label className="flex items-center justify-between cursor-pointer group border-b border-slate-700/50 pb-2">
                            <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors flex items-center gap-1">
                              <Activity size={12} /> Motion Lines Effect
                            </span>
                            <input 
                              type="checkbox" 
                              checked={viewOptions.showMotionLines} 
                              onChange={(e) => setViewOptions(prev => ({...prev, showMotionLines: e.target.checked}))}
                              className="w-3 h-3 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                            />
                          </label>

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
             </div>

             {/* COLOR CONFIG */}
             <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Palette size={14} /> Map Colors
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
                   <span className="text-sm text-slate-300">Selected Locations</span>
                   <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-mono">{colors.visited}</span>
                      <input
                        type="color"
                        value={colors.visited}
                        onChange={(e) => onColorChange('visited', e.target.value)}
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

                <div className="flex items-center justify-between">
                   <span className="text-sm text-slate-300">Motion Lines / Trails</span>
                   <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-mono">{colors.trail || '#ffffff'}</span>
                      <input
                        type="color"
                        value={colors.trail || '#ffffff'}
                        onChange={(e) => onColorChange('trail', e.target.value)}
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
        
        {/* Save/Load Lua Button */}
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
