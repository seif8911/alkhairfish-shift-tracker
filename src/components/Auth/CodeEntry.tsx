import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import LanguageSwitch from '../LanguageSwitch';

interface CodeEntryProps {
  onSubmit: (code: string) => void;
  loading: boolean;
  error: string | null;
}

const CodeEntry: React.FC<CodeEntryProps> = ({ onSubmit, loading, error }) => {
  const { t } = useTranslation();
  const [code, setCode] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString());
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onSubmit(code.trim());
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <LanguageSwitch />
        </div>
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-blue-600 px-6 py-8 text-center">
            <Clock className="h-16 w-16 text-white mx-auto mb-2" />
            <h1 className="text-3xl font-bold text-white">{t('codeEntry.title')}</h1>
            <p className="text-blue-100 mt-2">{t('codeEntry.subtitle')}</p>
            <div dir="ltr" className="text-white text-2xl mt-4 font-mono">{currentTime}</div>
          </div>
          
          <div className="px-6 py-8">
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label 
                  htmlFor="employee-code" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {t('codeEntry.enterCode')}
                </label>
                <input
                  id="employee-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-xl tracking-wider"
                  placeholder="EMP001"
                  autoFocus
                  disabled={loading}
                />
                {error && (
                  <p className="text-red-500 text-sm mt-2">{error}</p>
                )}
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                disabled={loading || !code.trim()}
              >
                {loading ? t('codeEntry.verifying') : t('codeEntry.proceed')}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <button 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                onClick={() => window.location.href = '/admin'}
              >
                {t('codeEntry.adminLogin')}
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-center text-gray-500 text-sm">
          {t('footer.copy')}
        </div>
      </div>
    </div>
  );
};

export default CodeEntry;