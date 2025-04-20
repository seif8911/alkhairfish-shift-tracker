import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface AdminLoginProps {
  onSubmit: (username: string, password: string) => void;
  loading: boolean;
  error: string | null;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onSubmit, loading, error }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password) {
      onSubmit(username.trim(), password);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-indigo-700 px-6 py-8 text-center">
            <ShieldCheck className="h-16 w-16 text-white mx-auto mb-2" />
            <h1 className="text-3xl font-bold text-white">Admin Portal</h1>
            <p className="text-indigo-100 mt-2">Employee Time Tracking System</p>
          </div>
          
          <div className="px-6 py-8">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label 
                  htmlFor="username" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="admin"
                  autoFocus
                  disabled={loading}
                />
              </div>
              
              <div className="mb-6">
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="••••••••"
                  disabled={loading}
                />
                {error && (
                  <p className="text-red-500 text-sm mt-2">{error}</p>
                )}
              </div>
              
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                disabled={loading || !username.trim() || !password}
              >
                {loading ? 'Authenticating...' : 'Log In'}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <button 
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                onClick={() => window.location.href = '/'}
              >
                Back to Employee Login
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-center text-gray-500 text-sm">
          © 2025 Alkhair Fish Restaurant. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;