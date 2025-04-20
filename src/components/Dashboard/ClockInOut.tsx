import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { Employee } from '../../types';
import { clockInApi, clockOutApi, fetchTimeRecordsApi, isEmployeeActiveApi } from '../../utils/api';

interface ClockInOutProps {
  employee: Employee;
}

const ClockInOut: React.FC<ClockInOutProps> = ({ employee }) => {
  const { t, i18n } = useTranslation();
  const [isClockedIn, setIsClockedIn] = useState<boolean>(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

  // Helper to parse server AST timestamp string into a JS Date
  const parseAstDate = (s: string): Date => {
    // If already an ISO Z string, parse directly
    if (s.endsWith('Z')) {
      return new Date(s);
    }
    // Otherwise assume 'YYYY-MM-DD HH:mm:ss' or similar
    const t = s.includes('T') ? s : s.replace(' ', 'T');
    return new Date(`${t}+03:00`);
  };

  // Check if employee is clocked in on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const status = await isEmployeeActiveApi(employee.id);
        setIsClockedIn(status);
        if (status) {
          const records = await fetchTimeRecordsApi(employee.id);
          const activeRecord = records.find(r => r.clockOut === null);
          if (activeRecord) setClockInTime(activeRecord.clockIn);
        } else {
          setClockInTime(null);
        }
      } catch (e) {
        console.error(e);
      }
    }
    checkStatus();
  }, [employee.id]);

  // Update current time and elapsed time every second using device clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString(i18n.language, {
        timeZone: 'Asia/Riyadh',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
      if (isClockedIn && clockInTime) {
        const elapsedMs = now.getTime() - parseAstDate(clockInTime).getTime();
        const hours = Math.floor(elapsedMs / 3600000);
        const minutes = Math.floor((elapsedMs % 3600000) / 60000);
        const seconds = Math.floor((elapsedMs % 60000) / 1000);
        setElapsedTime(
          `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`
        );
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isClockedIn, clockInTime, i18n.language]);

  const handleClockIn = async () => {
    const record = await clockInApi(employee.id);
    setIsClockedIn(true);
    setClockInTime(record.clockIn);
  };

  const handleClockOut = async () => {
    await clockOutApi(employee.id);
    setIsClockedIn(false);
    setClockInTime(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className={`px-6 py-6 text-white ${isClockedIn ? 'bg-green-600' : 'bg-blue-600'}`}>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">{t('dashboard.currentStatus')}</h2>
          <Clock className="h-6 w-6" />
        </div>
        <p className="mt-2 text-sm opacity-80">
          {t(isClockedIn ? 'dashboard.clockedIn' : 'dashboard.notClockedIn')}
        </p>
      </div>
      
      <div className="px-6 py-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm text-gray-500">{t('dashboard.currentTime')}</p>
            <p className="text-2xl font-semibold">{currentTime}</p>
          </div>
          
          {isClockedIn && (
            <div className="text-right">
              <p className="text-sm text-gray-500">{t('dashboard.timeElapsed')}</p>
              <p className="text-2xl font-semibold">{elapsedTime}</p>
            </div>
          )}
        </div>
        
        {isClockedIn && clockInTime && (
          <div className="mb-6 bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-500">{t('common.clockIn')}</p>
            <p className="text-lg font-medium">
              {parseAstDate(clockInTime).toLocaleTimeString(i18n.language, {
                timeZone: 'Asia/Riyadh',
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </p>
          </div>
        )}
        
        <div className="mt-4">
          {!isClockedIn ? (
            <button
              onClick={handleClockIn}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md flex items-center justify-center gap-2 transition-colors duration-200"
            >
              <LogIn className="h-5 w-5" />
              <span>{t('dashboard.clockInButton')}</span>
            </button>
          ) : (
            <button
              onClick={handleClockOut}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-md flex items-center justify-center gap-2 transition-colors duration-200"
            >
              <LogOut className="h-5 w-5" />
              <span>{t('dashboard.clockOutButton')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClockInOut;