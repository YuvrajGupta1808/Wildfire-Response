'use client';
import React, { useState } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '@/lib/store';
import { ShieldAlert, Home, MapPin, Battery, BatteryFull, Cross, Dog, Zap, HeartPulse, ExternalLink, Route, PlugZap } from 'lucide-react';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// Coordinates around Santa Rosa, CA
const INITIAL_VIEW_STATE = {
  longitude: -122.714,
  latitude: 38.4404,
  zoom: 11
};

export default function IncidentMap() {
  const { isMonitoring, members, resources, incident } = useAppStore();
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [popupInfo, setPopupInfo] = useState<any>(null);

  const getResourceIcon = (type: string) => {
    switch(type) {
      case 'shelter': return <Home className="w-5 h-5 text-white/80" />;
      case 'animal_shelter': return <Dog className="w-5 h-5 text-white/80" />;
      case 'charging': return <Zap className="w-5 h-5 text-white/80" />;
      case 'aid': return <HeartPulse className="w-5 h-5 text-white/80" />;
      case 'road_closure': return <Route className="w-5 h-5 text-white/80" />;
      case 'outage': return <PlugZap className="w-5 h-5 text-white/80" />;
      default: return <Home className="w-5 h-5 text-white/80" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return 'bg-emerald-500 text-white border-emerald-400';
      case 'needs_pickup': return 'bg-red-500 text-white border-red-400';
      case 'needs_medical_help': return 'bg-rose-600 text-white border-rose-400';
      case 'unreachable': return 'bg-orange-500 text-white border-orange-400';
      default: return 'bg-slate-400 text-white border-slate-300';
    }
  };

  // Mocked family coordinates mapped to initial state
  const familyWithCoords = members.map((member, i) => {
    return {
      ...member,
      kind: 'family',
      longitude: -122.720 + (i * 0.012),
      latitude: 38.435 + (i * 0.021),
    };
  });

  const resourcesWithCoords = resources.map((res, i) => {
    return {
      ...res,
      kind: 'resource',
      longitude: res.longitude,
      latitude: res.latitude,
    };
  });

  return (
    <div className="absolute inset-0 w-full h-full [&_.maplibregl-popup-content]:bg-neutral-900 [&_.maplibregl-popup-content]:border [&_.maplibregl-popup-content]:border-white/10 [&_.maplibregl-popup-content]:p-0 [&_.maplibregl-popup-content]:rounded-xl [&_.maplibregl-popup-tip]:border-t-neutral-900">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle={MAP_STYLE}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" />
        
        {/* Fire Incident Marker */}
        {isMonitoring && (
          <Marker 
            longitude={incident?.longitude ?? -122.650} 
            latitude={incident?.latitude ?? 38.480} 
            anchor="bottom"
            onClick={e => {
              e.originalEvent.stopPropagation();
              setPopupInfo({ kind: 'incident', longitude: incident?.longitude ?? -122.650, latitude: incident?.latitude ?? 38.480, name: incident?.name ?? 'Wildfire Incident' });
            }}
          >
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-4 bg-orange-500/20 rounded-full animate-ping"></div>
              <div className="relative bg-orange-600 text-white p-1.5 rounded-full shadow-[0_0_15px_rgba(234,88,12,0.8)] ring-2 ring-white/20">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
          </Marker>
        )}

        {/* Family Markers */}
        {familyWithCoords.map(member => (
          <Marker 
            key={member.id} 
            longitude={member.longitude} 
            latitude={member.latitude} 
            anchor="bottom"
            onClick={e => {
              e.originalEvent.stopPropagation();
              setPopupInfo(member);
            }}
          >
            <div className="flex flex-col items-center group cursor-pointer transition-transform hover:scale-110">
               <div className={`${getStatusColor(member.status)} p-1.5 rounded-full shadow-lg ring-2 ring-white/20`}>
                 <MapPin className="w-4 h-4" />
               </div>
            </div>
          </Marker>
        ))}

        {/* Resource Markers */}
        {isMonitoring && resourcesWithCoords.map((res) => (
          <Marker 
            key={res.id} 
            longitude={res.longitude} 
            latitude={res.latitude} 
            anchor="bottom"
            onClick={e => {
              e.originalEvent.stopPropagation();
              setPopupInfo(res);
            }}
          >
            <div className="flex flex-col items-center group cursor-pointer transition-transform hover:scale-110">
              <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.6)] ring-1 ring-white/20">
                 {getResourceIcon(res.type)}
              </div>
            </div>
          </Marker>
        ))}

        {/* Popup */}
        {popupInfo && (
          <Popup
            anchor="bottom"
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            onClose={() => setPopupInfo(null)}
            closeButton={false}
            offset={20}
            maxWidth="260px"
          >
            <div className="p-3 bg-neutral-900 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 cursor-pointer text-slate-500 hover:text-white" onClick={() => setPopupInfo(null)}>
                ×
              </div>
              
              {popupInfo.kind === 'incident' && (
                <div>
                  <h3 className="text-sm font-bold text-orange-500 mb-1 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> {popupInfo.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 mb-3 uppercase tracking-wider font-bold">Active Wildfire</p>
                  <div className="text-xs text-slate-300">
                    Evacuation order in effect. Avoid the area.
                  </div>
                </div>
              )}

              {popupInfo.kind === 'family' && (
                <div>
                  <div className="flex mt-1 items-start justify-between mb-3 pr-4">
                    <div>
                      <h3 className="text-sm font-bold text-white leading-tight">{popupInfo.name}</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {popupInfo.location}
                      </p>
                    </div>
                  </div>
                  
                  <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider mb-3 ${
                    popupInfo.status === 'safe' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                    popupInfo.status === 'needs_pickup' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                    'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  }`}>
                    {popupInfo.status.replace('_', ' ')}
                  </span>
                  
                  <div className="flex flex-col gap-1.5 bg-white/5 p-2 rounded border border-white/5">
                    {popupInfo.batteryLevel !== undefined && (
                      <div className="flex items-center gap-2 text-slate-300 text-xs">
                        {popupInfo.batteryLevel > 20 ? <BatteryFull className="w-3.5 h-3.5 text-emerald-400" /> : <Battery className="w-3.5 h-3.5 text-red-400 animate-pulse" />}
                        <span>Device: {popupInfo.batteryLevel}%</span>
                      </div>
                    )}
                    {popupInfo.needs && popupInfo.needs.length > 0 && (
                      <div className="flex items-center gap-2 text-slate-300 text-xs mt-1 border-t border-white/5 pt-1.5">
                        <Cross className="w-3.5 h-3.5 text-orange-400" />
                        <span>Needs: {popupInfo.needs[0]}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {popupInfo.kind === 'resource' && (
                <div>
                   <div className="flex mt-1 items-start justify-between mb-2 pr-4">
                    <h3 className="text-sm font-bold text-white leading-tight">{popupInfo.name}</h3>
                  </div>
                  
                  <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase font-bold tracking-wider mb-2">
                    {popupInfo.status}
                  </span>
                  
                  <div className="flex flex-col gap-1.5 bg-white/5 p-2 rounded border border-white/5 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{popupInfo.distance} away</span>
                    </div>
                    {popupInfo.capacity && (
                      <div className="flex items-center gap-2 mt-1 border-t border-white/5 pt-1.5">
                        <span className="text-slate-500 uppercase text-[9px] font-bold tracking-wider">Capacity:</span>
                        <span>{popupInfo.capacity}</span>
                      </div>
                    )}
                    {popupInfo.confidence !== undefined && (
                      <div className="flex items-center gap-2 mt-1 border-t border-white/5 pt-1.5">
                        <span className="text-slate-500 uppercase text-[9px] font-bold tracking-wider">Confidence:</span>
                        <span>{Math.round(popupInfo.confidence * 100)}%</span>
                      </div>
                    )}
                    {popupInfo.acceptsPets && (
                      <div className="flex items-center gap-2 mt-1 border-t border-white/5 pt-1.5 text-emerald-400">
                        <Dog className="w-3.5 h-3.5" />
                        <span>Pets Accepted</span>
                      </div>
                    )}
                  </div>
                  {popupInfo.url && (
                    <a href={popupInfo.url} target="_blank" rel="noreferrer" className="mt-2 flex w-fit items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300">
                      <ExternalLink className="h-3 w-3" /> Source
                    </a>
                  )}
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
