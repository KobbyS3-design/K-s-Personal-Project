import React from 'react';

export const EmptyDashboardGraphic = () => (
  <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-48 mx-auto mb-2">
    {/* Abstract Background */}
    <circle cx="120" cy="90" r="60" className="fill-teal-50 dark:fill-teal-900/10" />
    <circle cx="160" cy="50" r="20" className="fill-indigo-50 dark:fill-indigo-900/10" />
    <circle cx="80" cy="130" r="30" className="fill-rose-50 dark:fill-rose-900/10" />
    
    {/* Clipboard/Checklist */}
    <rect x="85" y="45" width="70" height="90" rx="8" className="fill-white dark:fill-slate-800 stroke-slate-200 dark:stroke-slate-600" strokeWidth="2" />
    <rect x="95" y="35" width="50" height="20" rx="4" className="fill-teal-600 dark:fill-teal-700" />
    <circle cx="120" cy="45" r="4" className="fill-white/30" />
    
    {/* Lines */}
    <path d="M95 70H145" className="stroke-slate-200 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round" />
    <path d="M95 85H145" className="stroke-slate-200 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round" />
    <path d="M95 100H145" className="stroke-slate-200 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round" />
    
    {/* Checkmark Badge */}
    <circle cx="145" cy="125" r="18" className="fill-teal-100 dark:fill-teal-800 stroke-white dark:stroke-slate-800" strokeWidth="3" />
    <path d="M137 125L142 130L153 119" className="stroke-teal-600 dark:stroke-teal-300" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    
    {/* Decorative Elements */}
    <path d="M170 100L175 95M175 105L180 100" className="stroke-amber-400" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const EmptyPatientsGraphic = () => (
  <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-48 mx-auto mb-2">
    <circle cx="120" cy="90" r="70" className="fill-slate-50 dark:fill-slate-800" />
    
    {/* ID Card / File */}
    <rect x="90" y="60" width="60" height="80" rx="6" className="fill-white dark:fill-slate-700 stroke-slate-200 dark:stroke-slate-600" strokeWidth="2" />
    <circle cx="120" cy="85" r="12" className="fill-slate-100 dark:fill-slate-600" />
    <path d="M105 110H135" className="stroke-slate-200 dark:stroke-slate-500" strokeWidth="2" strokeLinecap="round" />
    <path d="M105 120H130" className="stroke-slate-200 dark:stroke-slate-500" strokeWidth="2" strokeLinecap="round" />
    
    {/* Plus Button Graphic */}
    <circle cx="150" cy="50" r="15" className="fill-teal-50 dark:fill-teal-900/20" />
    <path d="M150 42V58M142 50H158" className="stroke-teal-500/50" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const EmptyMedsGraphic = () => (
  <svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-40 mx-auto mb-2">
     <ellipse cx="120" cy="130" rx="60" ry="10" className="fill-slate-100 dark:fill-slate-800" />
     
     {/* Pill Bottle */}
     <rect x="100" y="60" width="40" height="60" rx="4" className="fill-white dark:fill-slate-700 stroke-slate-300 dark:stroke-slate-500" strokeWidth="2" />
     <rect x="95" y="50" width="50" height="10" rx="2" className="fill-white dark:fill-slate-700 stroke-slate-300 dark:stroke-slate-500" strokeWidth="2" />
     <path d="M105 75H135" className="stroke-indigo-100 dark:stroke-indigo-900" strokeWidth="4" />
     
     {/* Floating Pills */}
     <g transform="rotate(15, 150, 60)">
        <rect x="150" y="50" width="24" height="10" rx="5" className="fill-rose-100 dark:fill-rose-900/30 stroke-rose-300 dark:stroke-rose-700" strokeWidth="1.5" />
        <path d="M162 50V60" className="stroke-rose-300 dark:stroke-rose-700" strokeWidth="1.5" />
     </g>
     
     <circle cx="80" cy="90" r="6" className="fill-teal-100 dark:fill-teal-900/30 stroke-teal-300 dark:stroke-teal-700" strokeWidth="1.5" />
  </svg>
);