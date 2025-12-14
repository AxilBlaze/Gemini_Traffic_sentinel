import React, { useEffect, useState } from 'react';
import { useLiveApi } from './hooks/use-live-api';
import { ConnectionStatus } from './types';
import ControlPanel from './components/ControlPanel';
import ViolationPanel from './components/ViolationPanel';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './utils/firebase-utils';

function App() {
  const { 
    status, 
    connect, 
    disconnect, 
    videoRef, 
    currentViolation,
    isAnalyzing, 
    errorMessage,
    switchCamera,
    facingMode
  } = useLiveApi();
  
  const [showAdmin, setShowAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const isConnected = status === ConnectionStatus.CONNECTED;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Auth Middleware listener
  useEffect(() => {
    // 1. Standard Firebase Listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
          setUser(currentUser);
      } else {
          // If Firebase says logged out, check if we are in Demo Mode
          const demo = localStorage.getItem('demo_user');
          if (demo) {
              try {
                  setUser(JSON.parse(demo));
              } catch (e) { setUser(null); }
          } else {
              setUser(null);
          }
      }
      setIsAuthLoading(false);
    });

    // 2. Custom Listener for Demo Mode (handles switching when Firebase isn't involved)
    const handleDemoAuth = () => {
         const demo = localStorage.getItem('demo_user');
         if (demo) {
             try {
                setUser(JSON.parse(demo));
             } catch (e) { setUser(null); }
         } else {
             // Only force null if Firebase is also disconnected
             if (!auth.currentUser) setUser(null);
         }
    };
    window.addEventListener('auth-state-change', handleDemoAuth);

    return () => {
        unsubscribe();
        window.removeEventListener('auth-state-change', handleDemoAuth);
    };
  }, []);

  const [visibleError, setVisibleError] = React.useState<string | null>(null);

  useEffect(() => {
    if (errorMessage) {
      setVisibleError(errorMessage);
    } else {
      setVisibleError(null);
    }
  }, [errorMessage]);

  // --- ROUTING LOGIC ---
  
  if (showAdmin) {
    if (isAuthLoading) {
      return (
        <div className="h-full w-full bg-gray-950 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      );
    }
    
    // Middleware Check: If no user, show login
    if (!user) {
      return <Login onBack={() => setShowAdmin(false)} />;
    }

    // If User exists, show dashboard
    return <AdminDashboard onBack={() => setShowAdmin(false)} />;
  }

  // --- MAIN APP (CAMERA VIEW) ---

  return (
    <div className="relative h-full w-full bg-black overflow-hidden flex flex-col items-center justify-center font-mono">
      
      {/* Background/Video Feed */}
      <div className="absolute inset-0 z-0">
        <video 
          ref={videoRef} 
          className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}`} 
          autoPlay 
          playsInline 
          muted 
        />
        
        {/* Overlay for inactive state */}
        {status === ConnectionStatus.DISCONNECTED && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm z-30">
            <div className="w-24 h-24 mb-6 rounded-full border-4 border-red-500 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-red-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tighter">
              GEMINI <span className="text-red-500">TRAFFIC</span> SENTINEL
            </h1>
            <p className="text-gray-400 max-w-md text-sm uppercase tracking-widest mb-8">
              Automated Violation Detection System
            </p>

            <button 
              onClick={() => setShowAdmin(true)}
              className="px-6 py-3 border border-gray-600 rounded bg-gray-900/50 hover:bg-gray-800 text-gray-300 text-sm font-bold tracking-widest transition-all hover:border-gray-400 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
              OPEN ADMIN DASHBOARD
            </button>
          </div>
        )}
      </div>

      {/* HUD Header */}
      <div className="absolute top-0 left-0 right-0 p-6 z-10 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] ${isConnected ? 'bg-red-500 animate-pulse text-red-500' : 'bg-gray-500 text-gray-500'}`}></div>
          <span className="text-sm font-bold tracking-widest uppercase text-white/90">
            {status === ConnectionStatus.CONNECTING ? 'INITIALIZING...' : 
             status === ConnectionStatus.CONNECTED ? 'SYSTEM ACTIVE' : 'SYSTEM OFFLINE'}
          </span>
        </div>
        {isConnected && (
            <div className="flex flex-col items-end">
                <span className="text-xs text-red-400 font-bold">REC ●</span>
                <span className="text-xs text-white/50">AI-VISION-V2.5</span>
            </div>
        )}
      </div>

      {/* Viewfinder Graphics (HUD) */}
      {isConnected && (
        <div className="absolute inset-8 border border-white/20 z-10 pointer-events-none flex flex-col justify-between p-2">
           {/* Crosshairs */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 pointer-events-none opacity-50">
             <div className="absolute top-0 left-1/2 w-0.5 h-4 bg-red-500/50 -translate-x-1/2"></div>
             <div className="absolute bottom-0 left-1/2 w-0.5 h-4 bg-red-500/50 -translate-x-1/2"></div>
             <div className="absolute left-0 top-1/2 h-0.5 w-4 bg-red-500/50 -translate-y-1/2"></div>
             <div className="absolute right-0 top-1/2 h-0.5 w-4 bg-red-500/50 -translate-y-1/2"></div>
           </div>

           <div className="flex justify-between">
              <div className="w-16 h-16 border-t-2 border-l-2 border-red-500/30"></div>
              <div className="w-16 h-16 border-t-2 border-r-2 border-red-500/30"></div>
           </div>
           <div className="flex justify-between">
              <div className="w-16 h-16 border-b-2 border-l-2 border-red-500/30"></div>
              <div className="w-16 h-16 border-b-2 border-r-2 border-red-500/30"></div>
           </div>
        </div>
      )}

      {/* Error Message */}
      {visibleError && (
        <div 
          onClick={() => setVisibleError(null)}
          className="absolute top-24 z-50 bg-red-600/90 hover:bg-red-600 text-white px-6 py-3 rounded shadow-lg max-w-[90%] text-center font-bold uppercase border border-red-400 cursor-pointer backdrop-blur-sm transition-all animate-in fade-in slide-in-from-top-4"
        >
          <div className="flex flex-col gap-1">
             <span>WARNING: {visibleError}</span>
             <span className="text-[10px] opacity-70 font-normal">(Click to dismiss)</span>
          </div>
        </div>
      )}

      {/* Violation Panel (Displays Processed UI) */}
      <ViolationPanel violation={currentViolation} isAnalyzing={isAnalyzing} />

      {/* Control Panel */}
      <ControlPanel 
        status={status} 
        onConnect={connect} 
        onDisconnect={disconnect} 
        onSwitchCamera={switchCamera}
      />
      
    </div>
  );
}

export default App;