import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock } from 'lucide-react';
import { Employee, TimeRecord } from '../../types';
import { fetchTimeRecordsApi } from '../../utils/api';

interface TimeTrackingProps {
  employee: Employee;
}

const TimeTracking: React.FC<TimeTrackingProps> = ({ employee }) => {
  const { t, i18n } = useTranslation();
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  // Removed client-side date filtering; using all server records
  // const [selectedDate, setSelectedDate] = useState<string>(/* not used */);

  // Fetch time records
  useEffect(() => {
    fetchTimeRecordsApi(employee.id)
      .then(setTimeRecords)
      .catch(console.error);
  }, [employee.id]);

  // Format time for display (HH:MM)
  const formatTime = (dateString: string | null): string => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    return date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Riyadh' });
  };

  // Format duration (hours and minutes)
  const formatDuration = (minutes: number | null): string => {
    if (minutes === null) return '--:--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Format date (e.g., "Mon, Jun 1")
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Riyadh'
    });
  };

  // Removed client-side date filtering; using all server records
  const filteredRecords = timeRecords;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-6 bg-indigo-600 text-white">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">{t('dashboard.timeRecords')}</h2>
          <Calendar className="h-6 w-6" />
        </div>
        <p className="mt-2 text-sm opacity-80">
          {t('dashboard.recentActivity')}
        </p>
      </div>
      
      <div className="px-6 py-6">
        {filteredRecords.length > 0 ? (
          <div className="space-y-4">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors duration-150"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-500">
                    {formatDate(record.date)}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    record.clockOut 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {record.clockOut ? t('common.completed') : t('common.active')}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">{t('common.clockIn')}</p>
                    <div className="flex items-center mt-1">
                      <Clock className="h-4 w-4 text-green-600 mr-1" />
                      <span className="font-medium">{formatTime(record.clockIn)}</span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-gray-500">{t('common.clockOut')}</p>
                    <div className="flex items-center mt-1">
                      <Clock className="h-4 w-4 text-red-600 mr-1" />
                      <span className="font-medium">{formatTime(record.clockOut)}</span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-gray-500">{t('common.duration')}</p>
                    <p className="font-medium mt-1">{formatDuration(record.duration)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-500">{t('dashboard.noTimeRecords')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeTracking;