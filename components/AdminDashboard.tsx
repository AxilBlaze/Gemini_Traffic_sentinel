import React, { useEffect, useState } from 'react';
import { TrafficViolation } from '../types';
import { getViolationsFromFirestore, logoutUser } from '../utils/firebase-utils';
import { sendViolationEmail } from '../utils/email-utils';

interface AdminDashboardProps {
  onBack: () => void;
}

const VIOLATION_TYPES = [
  { value: 'all', label: 'All Violations' },
  { value: 'helmet_missing_driver', label: 'No Helmet (Driver)' },
  { value: 'helmet_missing_pillion', label: 'No Helmet (Pillion)' },
  { value: 'triple_riding', label: 'Triple Riding' },
  { value: 'mobile_usage_driver', label: 'Mobile Usage' },
  { value: 'no_seatbelt_driver', label: 'No Seatbelt' },
  { value: 'red_light_signal_break', label: 'Red Light Jump' },
  { value: 'wrong_side', label: 'Wrong Side' },
  { value: 'number_plate_missing', label: 'Missing Plate' },
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [violations, setViolations] = useState<TrafficViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const rawData = await getViolationsFromFirestore();
        
        // --- DEDUPLICATION & CLEANUP LOGIC ---
        
        const uniqueViolations: TrafficViolation[] = [];
        
        // Data is already sorted by server_created_at desc (Newest first)
        for (const violation of rawData) {
          // 1. FILTER GARBAGE: If there are no violations listed, skip it (Fixes "0 Fine" issue)
          if (!violation.violation_type || violation.violation_type.length === 0) {
            continue;
          }

          if (!violation.vehicle_number || violation.vehicle_number === "UNKNOWN") {
            // Always keep UNKNOWN vehicles or those without plates as they can't be reliably deduplicated
            uniqueViolations.push(violation);
            continue;
          }

          const currentNormalized = violation.vehicle_number.replace(/[^A-Z0-9]/gi, '').toUpperCase();

          // Check if we already have a record for this vehicle in our 'kept' list
          // that is within 2 hours and shares a violation type
          const isDuplicate = uniqueViolations.some(kept => {
            const keptNormalized = kept.vehicle_number.replace(/[^A-Z0-9]/gi, '').toUpperCase();
            
            if (keptNormalized !== currentNormalized) return false;

            const timeDiff = Math.abs(new Date(kept.timestamp).getTime() - new Date(violation.timestamp).getTime());
            const hoursDiff = timeDiff / (1000 * 60 * 60);

            if (hoursDiff > 2) return false;

            // Check if violation types overlap
            const hasSharedCrime = kept.violation_type.some(t => violation.violation_type.includes(t));
            return hasSharedCrime;
          });

          if (!isDuplicate) {
            uniqueViolations.push(violation);
          }
        }

        setViolations(uniqueViolations);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSendEmail = async (violation: TrafficViolation, id: string) => {
    if (!violation.owner_email) return;
    
    // Prevent double clicks
    if (sendingIds.has(id)) return;

    setSendingIds(prev => new Set(prev).add(id));
    
    try {
      await sendViolationEmail(violation);
      alert(`Email successfully sent to ${violation.owner_email}`);
    } catch (error) {
      alert("Failed to send email. Check console for details.");
    } finally {
      setSendingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleLogout = async () => {
    try {
        await logoutUser();
        // The App.tsx state listener will detect logout and switch components
    } catch (e) {
        console.error("Logout error", e);
    }
  };

  const filteredViolations = filterType === 'all' 
    ? violations 
    : violations.filter(v => v.violation_type.includes(filterType as any));

  return (
    <div className="absolute inset-0 bg-gray-950 z-50 overflow-hidden flex flex-col font-mono text-gray-200">
      
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 bg-gray-900 border-b border-gray-800 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center border border-red-500/50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">ADMIN DASHBOARD</h1>
            <p className="text-xs text-gray-500 tracking-widest uppercase">Traffic Violation Database</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-900 hover:bg-red-900/40 border border-gray-700 hover:border-red-500/50 rounded-md text-sm text-gray-300 hover:text-red-400 transition-all flex items-center gap-2"
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
            </svg>
            LOGOUT
            </button>
            <button 
            onClick={onBack}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md text-sm transition-colors flex items-center gap-2"
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
            BACK
            </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-8 py-4 bg-gray-900/50 border-b border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">FILTER BY:</span>
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-gray-800 border-none text-white text-sm rounded-md px-4 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
          >
            {VIOLATION_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <div className="text-sm text-gray-400">
          TOTAL RECORDS: <span className="text-white font-bold">{filteredViolations.length}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-gray-950 no-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
            <p className="text-gray-500 animate-pulse">Retrieving encrypted records...</p>
          </div>
        ) : filteredViolations.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-gray-600">
               <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
             </svg>
             <p className="text-gray-500">No records found matching criteria.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredViolations.map((v, idx) => {
              // Create a semi-unique ID for tracking loading state since we don't have real IDs in the client type
              // We'll use index combined with timestamp
              const cardId = `card-${idx}-${v.timestamp}`;
              const isSending = sendingIds.has(cardId);

              return (
                <div key={idx} className="group relative bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-red-500/50 transition-all shadow-lg hover:shadow-red-500/10 flex flex-col">
                  
                  {/* Image Section */}
                  <div className="h-48 bg-gray-800 relative overflow-hidden">
                    <img 
                      src={v.image_url} 
                      alt="Violation Evidence" 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
                    
                    {/* Timestamp Badge */}
                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[10px] text-gray-300 border border-white/10">
                      {new Date(v.timestamp).toLocaleString()}
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="p-4 flex flex-col flex-1 gap-4">
                    
                    {/* Vehicle Info */}
                    <div className="flex justify-between items-start">
                       <div>
                         <h3 className="text-xl font-bold text-white tracking-wider font-mono">
                           {v.vehicle_number || "UNKNOWN"}
                         </h3>
                         <p className="text-xs text-gray-500 uppercase">{v.vehicle_type}</p>
                       </div>
                       <div className="px-2 py-1 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-xs font-bold">
                         ₹{v.total_fine.toLocaleString()}
                       </div>
                    </div>

                    {/* Violations List */}
                    <div className="flex flex-wrap gap-2">
                      {v.violation_type.map((type, i) => (
                        <span key={i} className="text-[10px] px-2 py-1 bg-gray-800 rounded text-gray-300 border border-gray-700">
                          {type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      ))}
                    </div>

                    {/* Footer / Actions */}
                    <div className="mt-auto pt-4 border-t border-gray-800 flex justify-between items-center">
                       <div className="flex flex-col">
                         <span className="text-[10px] text-gray-500">OWNER</span>
                         <span className="text-xs text-white font-medium truncate max-w-[100px]" title={v.owner_name || ""}>
                           {v.owner_name || "NOT FOUND"}
                         </span>
                       </div>

                       <button 
                         onClick={() => handleSendEmail(v, cardId)}
                         disabled={!v.owner_email || isSending}
                         className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-2 ${
                            !v.owner_email 
                             ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                             : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20'
                         } ${isSending ? 'opacity-70 cursor-wait' : ''}`}
                       >
                         {isSending ? (
                           <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                         ) : (
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                           </svg>
                         )}
                         {isSending ? 'SENDING...' : (v.owner_email ? 'SEND MAIL' : 'NO MAIL')}
                       </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;