import React from 'react';
import { ConnectionStatus } from '../types';

interface ControlPanelProps {
  status: ConnectionStatus;
  onConnect: () => void;
  onDisconnect: () => void;
  onSwitchCamera: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ status, onConnect, onDisconnect, onSwitchCamera }) => {
  const isConnected = status === ConnectionStatus.CONNECTED;
  const isConnecting = status === ConnectionStatus.CONNECTING;

  return (
    <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex items-center gap-6 z-20">
      
      {/* Main Connect/Disconnect Button */}
      {status === ConnectionStatus.DISCONNECTED || status === ConnectionStatus.ERROR ? (
        <button
          onClick={onConnect}
          className="group relative flex items-center justify-center w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-500 transition-all shadow-lg hover:shadow-blue-500/50"
        >
          <div className="absolute inset-0 rounded-full border-2 border-white/20 group-hover:scale-110 transition-transform"></div>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
          </svg>
        </button>
      ) : (
        <button
          onClick={onDisconnect}
          disabled={isConnecting}
          className={`group relative flex items-center justify-center w-20 h-20 rounded-full transition-all shadow-lg ${
             isConnecting ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 hover:shadow-red-500/50'
          }`}
        >
           {isConnecting ? (
             <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
           ) : (
             <>
               <div className="absolute inset-0 rounded-full border-2 border-white/20 group-hover:scale-110 transition-transform"></div>
               <div className="w-8 h-8 bg-white rounded-md"></div>
             </>
           )}
        </button>
      )}

      {/* Switch Camera Button - Only show when connected/connecting */}
      {isConnected && (
        <button
          onClick={onSwitchCamera}
          className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-sm border border-white/10 transition-all shadow-lg"
          title="Switch Camera"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white group-hover:rotate-180 transition-transform duration-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      )}

    </div>
  );
};

export default ControlPanel;