import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface QiblaCompassProps {
  lat: number;
  lng: number;
  isOpen: boolean;
  onClose: () => void;
}

const QiblaCompass: React.FC<QiblaCompassProps> = ({ lat, lng, isOpen, onClose }) => {
  const { theme } = useTheme();
  
  // RAW heading (0-360) for text display
  const [rawHeading, setRawHeading] = useState<number>(0);
  // SMOOTH/CUMULATIVE heading for CSS rotation (can go > 360 or < 0)
  const [smoothHeading, setSmoothHeading] = useState<number>(0);
  const lastHeadingRef = useRef<number>(0);

  const [qiblaBearing, setQiblaBearing] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [needsPermission, setNeedsPermission] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Constants for Kaaba location
  const KAABA_LAT = 21.422487;
  const KAABA_LNG = 39.826206;

  const calculateQibla = useCallback(() => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const phi1 = toRad(lat);
    const phi2 = toRad(KAABA_LAT);
    const deltaLambda = toRad(KAABA_LNG - lng);
    const lambda1 = toRad(lng);
    const lambda2 = toRad(KAABA_LNG);

    // 1. Calculate Bearing (Direction) / Azimuth
    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x =
      Math.cos(phi1) * Math.sin(phi2) -
      Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

    let bearing = toDeg(Math.atan2(y, x));
    bearing = (bearing + 360) % 360;
    
    setQiblaBearing(bearing);

    // 2. Calculate Distance (Haversine Formula)
    const R = 6371; // Earth's radius in km
    const dLat = phi2 - phi1;
    const dLon = lambda2 - lambda1;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(phi1) * Math.cos(phi2) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    
    setDistance(Math.round(d));
  }, [lat, lng]);

  useEffect(() => {
    calculateQibla();
  }, [calculateQibla]);

  // Manage Sensors based on isOpen state to save battery
  useEffect(() => {
    if (!isOpen) return;

    // Reset rotation refs when opening to prevent huge jumps from previous sessions
    lastHeadingRef.current = 0;
    setSmoothHeading(0);
    setRawHeading(0);

    const handleOrientation = (e: any) => {
      let compass = 0;
      
      // 1. iOS Webkit (Usually True Heading)
      if (e.webkitCompassHeading) {
        compass = e.webkitCompassHeading;
      } 
      // 2. Android - Check for 'absolute' property (True North)
      else if (e.absolute && e.alpha !== null) {
         compass = Math.abs(e.alpha - 360);
      }
      // 3. Standard Fallback (Magnetic North)
      else if (e.alpha !== null) {
        compass = Math.abs(e.alpha - 360); 
      }
      
      // Store Raw for text
      setRawHeading(compass);

      // --- SMOOTH ROTATION LOGIC ---
      // Determine the shortest path to the new angle to prevent 360->0 flip glitches
      const currentRaw = compass;
      const previousRaw = lastHeadingRef.current;
      
      let delta = currentRaw - previousRaw;
      
      // If jumping across North (e.g. 350 -> 10), delta is -340. We want +20.
      if (delta < -180) delta += 360;
      // If jumping across North backwards (e.g. 10 -> 350), delta is +340. We want -20.
      if (delta > 180) delta -= 360;

      // Update cumulative heading (used for CSS)
      setSmoothHeading(prev => prev + delta);
      
      // Update ref
      lastHeadingRef.current = currentRaw;
    };

    // Check permissions only when opening
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      setNeedsPermission(true);
    } else {
      setPermissionGranted(true);
      
      const win = window as any;
      // Try to listen to Absolute orientation first (for better GPS/Map alignment)
      if ('ondeviceorientationabsolute' in win) {
         win.addEventListener('deviceorientationabsolute', handleOrientation, true);
      } else {
         window.addEventListener('deviceorientation', handleOrientation, true);
      }
    }

    return () => {
      const win = window as any;
      if ('ondeviceorientationabsolute' in win) {
         win.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      } else {
         window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    };
  }, [isOpen]);

  const requestAccess = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
          setNeedsPermission(false);
        } else {
          setError('Izin akses sensor ditolak.');
        }
      } catch (e) {
        console.error(e);
        setError('Gagal meminta izin sensor.');
      }
    }
  };

  // 1. Dial (Compass Card): Rotates to align with Magnetic North
  const dialRotation = -smoothHeading;
  
  // 2. Qibla Needle: Points towards Mecca relative to the Phone's orientation
  // Effectively: The needle rotates to the specific bearing on the dial, minus the current phone rotation.
  const needleRotation = qiblaBearing - smoothHeading;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-all duration-300 ease-in-out ${
        isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
      }`}
    >
      <div 
        className={`${theme.id === 'subuh' ? 'bg-white' : 'bg-slate-900'} border ${theme.cardBorder} w-full max-w-sm rounded-[2rem] p-6 shadow-2xl flex flex-col relative overflow-hidden transition-all duration-300 ease-out transform ${
            isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 z-20 relative">
            <div>
                <h3 className="text-amber-500 font-arabic text-2xl font-bold">اتجاه القبلة</h3>
                <p className={`${theme.textMuted} text-[10px] uppercase tracking-wider`}>Kompas 3D Akurasi Tinggi</p>
            </div>
            <button onClick={onClose} className={`p-2 rounded-full ${theme.textMuted} hover:bg-slate-500/10`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
        </div>

        {/* Info Panel */}
        <div className={`z-20 mb-6 p-3 rounded-xl border ${theme.id === 'subuh' ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-800/50 border-slate-700'} text-xs grid grid-cols-2 gap-2`}>
             <div className="col-span-2 flex justify-between items-center border-b border-dashed border-slate-600/30 pb-2 mb-1">
                <span className={theme.textMuted}>Jarak Ka'bah</span>
                <span className={`font-mono ${theme.accent} font-bold`}>{distance.toLocaleString()} km</span>
            </div>
             <div className="flex flex-col">
                <span className={`${theme.textMuted} text-[10px]`}>Azimuth Kiblat</span>
                <span className={`font-mono ${theme.textMain} font-bold text-lg`}>{qiblaBearing.toFixed(0)}°</span>
            </div>
             <div className="flex flex-col text-right">
                <span className={`${theme.textMuted} text-[10px]`}>Arah HP</span>
                <span className={`font-mono ${theme.textMain} text-lg`}>{rawHeading.toFixed(0)}°</span>
            </div>
        </div>

        {/* 3D COMPASS CONTAINER */}
        <div className="relative w-72 h-72 mx-auto my-4 z-10 perspective-[1000px]">
          
          {/* Reference Triangle (Top of Phone) */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-50">
             <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-red-500 drop-shadow-lg"></div>
          </div>

          {/* THE COMPASS BODY (Outer Case) */}
          <div 
             className="relative w-full h-full rounded-full shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)]"
             style={{
                background: `linear-gradient(145deg, ${theme.id === 'subuh' ? '#e2e8f0' : '#1e293b'}, ${theme.id === 'subuh' ? '#cbd5e1' : '#0f172a'})`
             }}
          >
             {/* Metallic Bezel Ring */}
             <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-400 via-slate-200 to-slate-500 p-3 shadow-[inset_2px_2px_5px_rgba(255,255,255,0.4),inset_-2px_-2px_5px_rgba(0,0,0,0.4)]">
                 
                 {/* Inner Housing (Deep) */}
                 <div className="absolute inset-2 rounded-full bg-slate-900 shadow-[inset_0_10px_20px_rgba(0,0,0,0.9)] overflow-hidden">
                    
                    {/* --- LAYER 1: ROTATING DIAL (Compass Rose) --- */}
                    <div 
                        className="absolute inset-1 rounded-full will-change-transform"
                        style={{ 
                            transform: `rotate(${dialRotation}deg)`,
                            transition: 'transform 0.4s cubic-bezier(0.2, 0, 0, 1)',
                            background: theme.id === 'subuh' 
                                ? 'radial-gradient(circle, #f8fafc 0%, #cbd5e1 100%)' 
                                : 'radial-gradient(circle, #334155 0%, #020617 100%)'
                        }}
                    >
                        {/* Dial Texture */}
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent to-black"></div>

                        {/* Cardinal Points */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xl font-bold text-red-600 font-sans tracking-widest drop-shadow-sm">N</div>
                        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 text-xl font-bold ${theme.id === 'subuh' ? 'text-slate-700' : 'text-slate-300'} font-sans tracking-widest`}>S</div>
                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold ${theme.id === 'subuh' ? 'text-slate-700' : 'text-slate-300'} font-sans tracking-widest`}>W</div>
                        <div className={`absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold ${theme.id === 'subuh' ? 'text-slate-700' : 'text-slate-300'} font-sans tracking-widest`}>E</div>

                        {/* Ticks */}
                        {[...Array(72)].map((_, i) => {
                            const deg = i * 5;
                            const isMajor = deg % 90 === 0;
                            const isMinor = deg % 30 === 0;
                            return (
                                <div 
                                    key={i}
                                    className="absolute inset-0"
                                    style={{ transform: `rotate(${deg}deg)` }}
                                >
                                    <div 
                                        className={`absolute top-0 left-1/2 -translate-x-1/2 ${
                                            isMajor ? 'h-4 w-1 bg-red-500' : 
                                            isMinor ? `h-3 w-0.5 ${theme.id === 'subuh' ? 'bg-slate-800' : 'bg-slate-300'}` : 
                                            `h-1.5 w-px ${theme.id === 'subuh' ? 'bg-slate-400' : 'bg-slate-600'}`
                                        }`}
                                    ></div>
                                </div>
                            )
                        })}

                        {/* Degree Numbers */}
                        {[30, 60, 120, 150, 210, 240, 300, 330].map(deg => (
                            <div 
                                key={deg}
                                className={`absolute top-8 left-1/2 -translate-x-1/2 origin-[50%_110px] text-[8px] font-mono font-medium ${theme.id === 'subuh' ? 'text-slate-500' : 'text-slate-400'}`}
                                style={{ transform: `rotate(${deg}deg)` }}
                            >
                                {deg}
                            </div>
                        ))}
                    </div>

                    {/* --- LAYER 2: QIBLA NEEDLE (3D GOLDEN ARROW) --- */}
                    <div 
                        className="absolute inset-0 z-10 will-change-transform flex items-center justify-center pointer-events-none"
                        style={{ 
                            transform: `rotate(${needleRotation}deg)`,
                            transition: 'transform 0.4s cubic-bezier(0.2, 0, 0, 1)'
                        }}
                    >
                         {/* This container has a subtle float animation */}
                         <div className="relative w-full h-full animate-[pulse_3s_ease-in-out_infinite]">
                            
                            {/* The Golden Arrow Structure */}
                            <div className="absolute top-[10%] left-1/2 -translate-x-1/2 h-[45%] w-6 origin-bottom filter drop-shadow-[4px_4px_4px_rgba(0,0,0,0.5)]">
                                {/* Left Facet (Light Gold) */}
                                <div 
                                    className="absolute right-[50%] top-0 h-full w-3 bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600"
                                    style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 85%)' }}
                                ></div>
                                {/* Right Facet (Dark Gold) */}
                                <div 
                                    className="absolute left-[50%] top-0 h-full w-3 bg-gradient-to-b from-amber-300 via-amber-600 to-amber-800"
                                    style={{ clipPath: 'polygon(0 0, 100% 85%, 0 100%)' }}
                                ></div>
                                
                                {/* Kaaba Icon positioned on the needle */}
                                <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-6 h-6 bg-black border border-amber-400 shadow-md flex items-center justify-center">
                                    <div className="w-full h-[1px] bg-amber-400 absolute top-1.5 opacity-80"></div>
                                </div>
                            </div>

                            {/* Counterweight (Tail) */}
                            <div className="absolute bottom-[25%] left-1/2 -translate-x-1/2 h-[25%] w-2 origin-top bg-gradient-to-t from-slate-600 to-slate-400 rounded-full opacity-80 shadow-sm"></div>

                         </div>
                    </div>

                    {/* --- LAYER 3: CENTER PIN --- */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 z-20">
                        {/* Pin Cap */}
                        <div className="w-full h-full rounded-full bg-gradient-to-tr from-slate-700 to-slate-200 shadow-[0_4px_6px_rgba(0,0,0,0.6)] border border-slate-600"></div>
                        {/* Center Screw */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-900 opacity-60"></div>
                    </div>

                    {/* --- LAYER 4: GLASS COVER (Reflections) --- */}
                    <div className="absolute inset-0 z-30 rounded-full pointer-events-none">
                        {/* Top Glare */}
                        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full"></div>
                        {/* Bottom Reflection */}
                        <div className="absolute bottom-4 left-10 right-10 h-12 bg-gradient-to-t from-white/10 to-transparent rounded-full blur-md transform rotate-12"></div>
                        {/* Rim Highlight */}
                        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]"></div>
                    </div>

                 </div>
             </div>
          </div>
        </div>

        {/* Instructions */}
        {needsPermission && !permissionGranted ? (
            <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-6 text-center rounded-[2rem]">
                <p className="text-white mb-4">Izin sensor diperlukan untuk menjalankan kompas.</p>
                <button 
                    onClick={requestAccess}
                    className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-bold shadow-lg active:scale-95 transition-transform"
                >
                    Izinkan Sensor
                </button>
            </div>
        ) : (
            <div className={`mt-auto text-center ${theme.textMuted} text-[10px]`}>
                <p className="mb-3 opacity-80 max-w-[200px] mx-auto leading-tight">
                    Putar HP Anda hingga jarum emas sejajar dengan panah merah di atas.
                </p>
                <button 
                    onClick={onClose}
                    className={`w-full py-3 ${theme.id === 'subuh' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} rounded-xl font-medium transition-colors border ${theme.cardBorder}`}
                >
                    Tutup Kompas
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default QiblaCompass;