import React from 'react';
import { TrafficViolation } from '../types';

interface ViolationPanelProps {
  violation: TrafficViolation | null;
  isAnalyzing: boolean;
}

const ViolationPanel: React.FC<ViolationPanelProps> = ({ violation, isAnalyzing }) => {
  if (!violation && !isAnalyzing) return null;

  return (
    <div className="absolute top-24 right-4 w-full max-w-sm z-30 flex flex-col items-end gap-4 pointer-events-none">
      
      {/* PROCESSING STATE */}
      {isAnalyzing && (
        <div className="bg-gray-900/90 backdrop-blur-xl border-l-4 border-yellow-500 rounded-r-lg p-5 shadow-[0_0_20px_rgba(234,179,8,0.2)] flex flex-col gap-3 w-80 animate-in fade-in slide-in-from-right-8 duration-300 pointer-events-auto">
           <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-1">
             <div className="flex items-center gap-2">
                <div className="relative w-2 h-2">
                  <div className="absolute inset-0 bg-yellow-500 rounded-full animate-ping"></div>
                  <div className="relative w-2 h-2 bg-yellow-500 rounded-full"></div>
                </div>
                <span className="text-yellow-400 font-bold tracking-widest text-xs font-mono uppercase">
                  System Processing
                </span>
             </div>
             <span className="text-[10px] text-gray-500 font-mono">AI-ANALYSIS</span>
           </div>
           
           <div className="space-y-2.5">
             <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border border-yellow-500/50 flex items-center justify-center">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                </div>
                <span className="text-gray-300 text-xs font-mono">Identifying vehicle type...</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border border-yellow-500/50 flex items-center justify-center">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse delay-75"></div>
                </div>
                <span className="text-gray-300 text-xs font-mono">Reading number plate...</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border border-yellow-500/50 flex items-center justify-center">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse delay-150"></div>
                </div>
                <span className="text-gray-300 text-xs font-mono">Calculating fines...</span>
             </div>
           </div>

           <div className="w-full bg-gray-800 h-0.5 mt-2 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 w-1/3 animate-[translateX_1s_ease-in-out_infinite] transform translate-x-[-100%]"></div>
           </div>
        </div>
      )}

      {/* COMPACT 'DONE' STATUS (Replaces large card) */}
      {!isAnalyzing && violation && (
        <div className="bg-green-900/90 backdrop-blur-xl border-l-4 border-green-500 rounded-r-lg p-4 shadow-[0_0_20px_rgba(34,197,94,0.2)] flex items-center gap-4 w-80 animate-in fade-in slide-in-from-right-8 duration-300 pointer-events-auto">
           <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/50 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-green-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
           </div>
           <div>
              <div className="text-green-400 font-bold font-mono tracking-wider text-sm">VIOLATION LOGGED</div>
              <div className="text-[10px] text-green-500/70 font-mono">
                DATA SUBMITTED SUCCESSFULLY
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ViolationPanel;