import React, { useEffect, useState, useMemo } from 'react';
import { PrayerTime } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface AnalogClockProps {
  prayers: PrayerTime[];
}

// Standardized Arabic names to ensure consistency regardless of API output
const ARABIC_NAME_MAP: Record<string, string> = {
  'Fajr': 'الفجر',
  'Shuruq': 'الشروق',
  'Duha': 'الضحى',
  'Dhuhr': 'الظهر',
  'Asr': 'العصر',
  'Maghrib': 'المغرب',
  'Isha': 'العشاء',
  'Midnight': 'نصف الليل',
  'LastThird': 'الثلث الأخير'
};

// URL Gambar Background (Logo)
// Pastikan file ini ada di folder public Anda
const CLOCK_BG_IMAGE = "/clock_bg.png";

const AnalogClock: React.FC<AnalogClockProps> = ({ prayers }) => {
  const { theme } = useTheme();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    let animationFrameId: number;

    const updateTime = () => {
      setTime(new Date());
      animationFrameId = requestAnimationFrame(updateTime);
    };

    // Start the loop
    animationFrameId = requestAnimationFrame(updateTime);

    // Clean up
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const milliseconds = time.getMilliseconds();
  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours();

  // --- Dynamic Lighting Calculations ---
  // Calculate decimal time (0.0 - 24.0)
  const decimalTime = hours + minutes / 60 + seconds / 3600;

  // Calculate Sun/Light Angle
  // We simulate the sun moving from East (Right) to West (Left) over the top.
  // 06:00 -> 0 deg (Right)
  // 12:00 -> -90 deg (Top)
  // 18:00 -> -180 deg (Left)
  // 00:00 -> -270 / 90 deg (Bottom)
  // Formula matches: (6 - decimalTime) * 15
  const lightAngleDeg = (6 - decimalTime) * 15;
  const lightAngleRad = (lightAngleDeg * Math.PI) / 180;

  // 1. Light Source Position on Face (for radial gradients)
  // Range 0% to 100%, Center is 50,50.
  // We want the "shine" to be roughly 35-40% away from center towards light.
  const lightX = 50 + 35 * Math.cos(lightAngleRad);
  const lightY = 50 + 35 * Math.sin(lightAngleRad);

  // 2. SVG Shadow Offset (Opposite to light)
  // Used for hands and markers to cast shadow on the face.
  const shadowDist = 2.5;
  const shadowDx = -1 * shadowDist * Math.cos(lightAngleRad);
  const shadowDy = -1 * shadowDist * Math.sin(lightAngleRad);

  // 3. Wall Shadow (The entire clock casting shadow on background)
  // Larger offset.
  const wallShadowDist = 15;
  const wallShadowDx = -1 * wallShadowDist * Math.cos(lightAngleRad);
  const wallShadowDy = -1 * wallShadowDist * Math.sin(lightAngleRad);

  // 4. Bezel Gradient Rotation
  // We want the highlight to face the light.
  // Linear gradient angle in CSS: 0deg is to Top, 90deg is to Right.
  // If light is Top (-90 cartesian), we want gradient Top->Bottom.
  // CSS: 180deg.
  // If light is Right (0 cartesian), we want gradient Right->Left.
  // CSS: 270deg.
  // Relation: CSS = LightAngle + 270.
  const bezelGradientDeg = lightAngleDeg + 270;

  // --- Clock Logic ---

  // Calculate angles with high precision for smooth sweeping motion
  const secondAngle = ((seconds + milliseconds / 1000) / 60) * 360;
  const minuteAngle = ((minutes + (seconds + milliseconds / 1000) / 60) / 60) * 360;
  const hourAngle = ((hours % 12 + minutes / 60 + seconds / 3600) / 12) * 360;

  // Helper to get angle for a specific HH:MM string (12h format)
  const getPrayerAngle = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return ((h % 12 + m / 60) / 12) * 360;
  };

  // Memoize prayer markers to avoid re-calc on every render
  const prayerMarkers = useMemo(() => {
    return prayers.map((p) => {
      const angle = getPrayerAngle(p.time);
      const isPM = parseInt(p.time.split(':')[0]) >= 12;
      
      // Calculate position for the icon/dot on the clock face
      const rad = (angle - 90) * (Math.PI / 180);
      const x = 50 + 40 * Math.cos(rad); 
      const y = 50 + 40 * Math.sin(rad);

      return { ...p, angle, x, y, isPM };
    });
  }, [prayers]);

  // Convert theme stroke classes to fill classes for tapered hands
  const hourHandFill = theme.clockHandHour.replace('stroke-', 'fill-');
  const minuteHandFill = theme.clockHandMinute.replace('stroke-', 'fill-');

  return (
    <div 
      className="relative w-72 h-72 md:w-96 md:h-96 mx-auto my-8 transition-all duration-300 ease-out"
      style={{
         // Dynamic drop shadow for the whole clock based on light source
         filter: `drop-shadow(${wallShadowDx}px ${wallShadowDy}px 30px rgba(0,0,0,0.6))`
      }}
    >
      
      {/* --- 3D LAYERS STRUCTURE --- */}

      {/* 1. Outer Glow/Ambient Shadow */}
      <div className={`absolute -inset-6 rounded-full blur-3xl opacity-20 ${theme.accentBg}`}></div>
      
      {/* 2. The Bezel (Frame) - Metallic Gradient with Dynamic Rotation */}
      <div 
        className="absolute inset-0 rounded-full p-3 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.1)]"
        style={{
            background: `linear-gradient(${bezelGradientDeg}deg, rgba(30,41,59,1) 0%, rgba(71,85,105,1) 50%, rgba(15,23,42,1) 100%)`
        }}
      >
        {/* Inner Bezel Ring */}
         <div className="absolute inset-0 rounded-full border border-white/5"></div>
      </div>

      {/* 3. The Clock Housing (Inner Depth) */}
      <div className="absolute inset-3 rounded-full shadow-[inset_0_10px_20px_rgba(0,0,0,0.6),_inset_0_-2px_5px_rgba(255,255,255,0.05)] overflow-hidden">
         
         {/* 4. Clock Face Background (Dynamic Radial Gradient) */}
         <div 
            className="absolute inset-0 transition-opacity duration-1000"
            style={{
                // Override static theme gradient with dynamic sun position
                background: `radial-gradient(circle at ${lightX}% ${lightY}%, ${theme.id === 'subuh' ? 'rgba(255,255,255,1)' : 'rgba(51,65,85,1)'} 0%, ${theme.id === 'subuh' ? 'rgba(226,232,240,1)' : 'rgba(2,6,23,1)'} 90%)`
            }}
         ></div>

         {/* 4.5 NEW: Background Image / Logo Layer */}
         {/* This layer sits between the gradient and the markers */}
         <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
            <img 
               src={CLOCK_BG_IMAGE} 
               alt="Clock Background" 
               // Hide if image not found to prevent broken icon
               onError={(e) => e.currentTarget.style.display = 'none'}
               className={`w-[60%] h-[60%] object-contain transition-all duration-500 ${
                  theme.id === 'subuh' 
                    ? 'opacity-25 mix-blend-multiply grayscale-[10%]' 
                    : 'opacity-30 mix-blend-overlay grayscale-[30%]'
               }`}
            />
         </div>
         
         {/* Subtle Texture/Pattern on Face */}
         <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black to-transparent" style={{backgroundSize: '4px 4px'}}></div>
      </div>

      {/* 5. SVG Layer 1: Background Elements (Markers & Text) */}
      <svg className="absolute inset-0 w-full h-full p-4 z-0" viewBox="0 0 100 100" style={{zIndex: 5}}>
        <defs>
          <filter id="dynamicShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" />
            <feOffset dx={shadowDx} dy={shadowDy} result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.4" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* LAYER A: Prayer Time Lines & Dots */}
        {prayerMarkers.map((p, idx) => (
            <g key={`marker-${idx}`}>
               {/* Marker Line - NEXT is GREEN, OTHERS are YELLOW */}
               {/* Added animate-pulse to the line as well if it is Next */}
              <line
                x1="50" y1="50"
                x2={50 + 32 * Math.cos((p.angle - 90) * (Math.PI / 180))}
                y2={50 + 32 * Math.sin((p.angle - 90) * (Math.PI / 180))}
                stroke="currentColor"
                className={p.isNext ? "text-emerald-400 animate-pulse" : "text-yellow-500"}
                strokeWidth={p.isNext ? "1.2" : "0.8"}
                strokeDasharray="2,2"
                opacity={p.isNext ? "1" : "0.8"}
              />
              {/* Dot - NEXT is GREEN, OTHERS are YELLOW */}
              <circle
                cx={p.x}
                cy={p.y}
                r={p.isNext ? "2.5" : "1.5"}
                className={p.isNext ? "fill-emerald-500 animate-pulse" : "fill-yellow-500"}
                filter="url(#dynamicShadow)"
              />
            </g>
        ))}

        {/* LAYER B: Prayer Text Labels */}
        {prayerMarkers.map((p, idx) => (
            <g key={`text-${idx}`}>
               {/* Text Halo */}
              <text
                 x={p.x}
                 y={p.y}
                 dx={p.x > 50 ? 3.5 : -3.5}
                 dy="0.1em"
                 dominantBaseline="middle"
                 textAnchor={p.x > 50 ? "start" : "end"}
                 className={theme.id === 'subuh' ? "stroke-white" : "stroke-black"}
                 strokeWidth="1.2"
                 strokeLinejoin="round"
                 style={{fontSize: '4px', fontFamily: 'Amiri, serif'}}
                 opacity="0.8"
              >
                {ARABIC_NAME_MAP[p.name] || p.nameArabic}
              </text>
              {/* Actual Text - CHANGED TO WHITE FOR INACTIVE */}
              <text
                 x={p.x}
                 y={p.y}
                 dx={p.x > 50 ? 3.5 : -3.5}
                 dy="0.1em"
                 dominantBaseline="middle"
                 textAnchor={p.x > 50 ? "start" : "end"}
                 className={`font-arabic ${p.isNext ? "fill-emerald-400 font-bold animate-pulse" : "fill-white"}`}
                 style={{
                   fontSize: '4px', 
                   textShadow: p.isNext 
                     ? `${shadowDx/2}px ${shadowDy/2}px 1px rgba(16, 185, 129, 0.8)` // Green glow for Active
                     : `${shadowDx/2}px ${shadowDy/2}px 1px rgba(0, 0, 0, 0.8)`,   // Black shadow for White Text
                 }}
              >
                {ARABIC_NAME_MAP[p.name] || p.nameArabic}
              </text>
            </g>
        ))}
      </svg>

      {/* 6. Arabic Numerals (Floating above face, Z-Index 10) */}
      {[...Array(12)].map((_, i) => {
        const num = i + 1;
        const angle = (num * 30 - 90) * (Math.PI / 180);
        const radius = 41; // percentage
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);
        
        const arabicNums = ['١٢', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '١٠', '١١'];
        
        return (
          <div
            key={num}
            // Numerals remain Amber/Orange as per previous context
            className={`absolute font-arabic text-xl md:text-2xl ${theme.id === 'subuh' ? 'text-amber-600' : 'text-amber-400'} font-bold pointer-events-none transition-all duration-1000`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              // Dynamic text shadow opposite to light
              textShadow: `${shadowDx}px ${shadowDy}px 4px rgba(0,0,0,0.5)`
            }}
          >
            {arabicNums[num % 12]}
          </div>
        );
      })}

      {/* 
         9. Digital Time Overlay - CONCAVE / RECESSED STYLE 
         Z-Index 15 (Behind hands, above numerals)
         Style: Dark inset shadow to create "hole" effect in the clock face
      */}
      <div className="absolute top-[65%] left-1/2 -translate-x-1/2 z-[15] flex justify-center">
        {/* The Capsule Container */}
        <div 
            className="relative px-2 py-0.5 rounded-full flex items-center justify-center border border-white/5"
            style={{
                // Concave Background: Slightly darker than the face to imply depth
                background: theme.id === 'subuh' ? 'rgba(203, 213, 225, 0.4)' : 'rgba(2, 6, 23, 0.5)',
                // Concave Shadows: 
                // Top-Left Inset = Dark (Shadow inside hole)
                // Bottom-Right Inset = Light (Highlight on edge of hole)
                boxShadow: `
                  inset 2px 2px 5px rgba(0,0,0,0.4), 
                  inset -1px -1px 2px rgba(255,255,255,0.1),
                  0 1px 0 rgba(255,255,255,0.05)
                `
            }}
        >
            {/* The Text */}
            <span 
                className={`relative z-10 font-mono text-sm md:text-base font-bold tracking-[0.2em] ${theme.id === 'subuh' ? 'text-slate-700' : 'text-slate-300'}`}
                style={{
                    // Subtle shadow to lift text off the recessed floor
                    textShadow: '0 1px 1px rgba(0,0,0,0.1)'
                }}
            >
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        </div>
      </div>

      {/* 7. SVG Layer 2: Foreground Elements (Hands) - Z-Index 20 */}
      <svg className="absolute inset-0 w-full h-full p-4 z-20" viewBox="0 0 100 100">
        <defs>
          <radialGradient id="pinGradient" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
            <stop offset="0%" stopColor="#d1d5db" />
            <stop offset="100%" stopColor="#4b5563" />
          </radialGradient>
          
          {/* Dynamic Hand Shadow - Deeper and offset based on light */}
          <filter id="handShadowDynamic" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
            <feOffset dx={shadowDx * 1.5} dy={shadowDy * 1.5} result="offsetblur" />
            <feFlood floodColor="black" floodOpacity="0.6" />
            <feComposite in2="offsetblur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* LAYER C: Clock Hands */}
        
        {/* Hour Hand (Tapered Sword Shape) */}
        {/* Points up at 12:00. Center 50,50. Tip at 50, 25. Base width approx 6 units */}
        <path
          d="M 50 25 L 53 50 L 50 55 L 47 50 Z"
          className={hourHandFill}
          transform={`rotate(${hourAngle} 50 50)`}
          filter="url(#handShadowDynamic)"
          stroke="none"
        />

        {/* Minute Hand (Tapered Sword Shape - Thinner & Longer) */}
        {/* Tip at 50, 15. Base width approx 4 units */}
        <path
          d="M 50 15 L 52 50 L 50 55 L 48 50 Z"
          className={minuteHandFill}
          transform={`rotate(${minuteAngle} 50 50)`}
          filter="url(#handShadowDynamic)"
          stroke="none"
        />

        {/* Second Hand (Thin Line with Counterweight) */}
        <g 
            transform={`rotate(${secondAngle} 50 50)`} 
            filter="url(#handShadowDynamic)"
        >
            {/* Main stick */}
            <line
                x1="50" y1="60" x2="50" y2="10"
                className={theme.clockHandSecond}
                strokeWidth="0.8"
                strokeLinecap="round"
            />
            {/* Counterweight Circle */}
            <circle 
                cx="50" cy="50" r="1.5" 
                className={theme.clockHandSecond.replace('stroke-', 'fill-')} 
                stroke="none"
            />
            {/* Tail Weight */}
            <circle 
                cx="50" cy="56" r="1" 
                className={theme.clockHandSecond.replace('stroke-', 'fill-')} 
                stroke="none"
            />
        </g>
        
        {/* Center Pin Cap */}
        <circle cx="50" cy="50" r="2.5" fill="url(#pinGradient)" stroke="#374151" strokeWidth="0.5" filter="url(#handShadowDynamic)" />
        <circle cx="50" cy="50" r="0.5" fill="#1f2937" />

      </svg>
      
      {/* 8. Glass Reflection (Gloss Overlay) */}
      <div className="absolute inset-4 rounded-full pointer-events-none z-30 overflow-hidden">
        {/* Dynamic glare rotation opposite to shadow */}
        <div 
            className="absolute -top-10 -left-10 right-0 h-[60%] bg-gradient-to-b from-white/10 to-transparent rounded-t-full blur-sm transition-transform duration-1000"
            style={{ 
                transform: `rotate(${lightAngleDeg}deg)`, 
                transformOrigin: '50% 100%'
            }}
        ></div>
        <div className="absolute bottom-2 left-10 right-10 h-1/6 bg-gradient-to-t from-white/5 to-transparent rounded-b-full blur-md"></div>
      </div>
      
    </div>
  );
};

export default AnalogClock;