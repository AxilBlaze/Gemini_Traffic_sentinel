import React, { useState } from 'react';
import { loginUser, registerUser } from '../utils/firebase-utils';

interface LoginProps {
  onBack: () => void;
}

const Login: React.FC<LoginProps> = ({ onBack }) => {
  // Initialize with empty strings so fields are blank
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await loginUser(email, password);
      // Auth state listener in App.tsx will handle the redirect to dashboard
    } catch (err: any) {
      console.error(err);
      
      // AUTO-PROVISIONING LOGIC
      // If the specific admin user doesn't exist, create it on the fly.
      // Note: 'auth/invalid-credential' can sometimes be returned for non-existent users depending on config.
      if (email === 'i_am_traffic_police@gmail.com' && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
         try {
             console.log("User not found. Auto-creating admin account...");
             await registerUser(email, password);
             // Registration successful, user is now logged in. 
             // App.tsx listener will redirect.
             return;
         } catch (regErr: any) {
             console.error("Auto-creation failed", regErr);
             // If registration failed because email is in use, then the password was actually wrong
             if (regErr.code === 'auth/email-already-in-use') {
                 setError('Invalid credentials. Access Denied.');
             } else {
                 setError('Authentication failed. Please contact support.');
             }
         }
      } else {
          // Standard Error Handling
          if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
            setError('Invalid credentials. Access Denied.');
          } else {
            setError('Login failed. Please check network connection.');
          }
      }
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-gray-950 z-50 flex flex-col items-center justify-center p-4 font-mono">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-3xl"></div>
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
      </div>

      <div className="w-full max-w-md bg-gray-900/80 border border-gray-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-blue-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-widest">SECURE LOGIN</h2>
          <p className="text-gray-500 text-xs mt-2 uppercase tracking-wider">Authorized Personnel Only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Officer ID (Email)</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-700"
              placeholder="officer@traffic.police"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Access Key (Password)</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-700"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-xs flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-3.5 rounded-lg font-bold text-sm uppercase tracking-widest transition-all ${
              loading 
                ? 'bg-blue-900 text-blue-300 cursor-wait' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
            }`}
          >
            {loading ? 'Authenticating...' : 'Access Dashboard'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-800 text-center">
          <button 
            onClick={onBack}
            className="text-xs text-gray-500 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
            RETURN TO SURVEILLANCE
          </button>
        </div>

      </div>
    </div>
  );
};

export default Login;