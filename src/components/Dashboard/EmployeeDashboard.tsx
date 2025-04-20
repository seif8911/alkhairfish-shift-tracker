import React from 'react';
import { Employee } from '../../types';
import ClockInOut from './ClockInOut';
import TimeTracking from './TimeTracking';
import { LogOut, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitch from '../LanguageSwitch';

interface EmployeeDashboardProps {
  employee: Employee;
  onLogout: () => void;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ employee, onLogout }) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-800">{t('dashboard.title')}</h1>
            </div>
            
            <div className="flex items-center">
              <div className="hidden md:flex items-center mr-4">
                <User className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-700">{employee.name}</span>
              </div>
              <div className="flex flex-col items-end">
                <button
                  onClick={onLogout}
                  className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  <span>{t('auth.logout')}</span>
                </button>
                <div className="mt-2">
                  <LanguageSwitch />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex items-start gap-6">
          <div className="md:w-1/3 mb-6 md:mb-0">
            <ClockInOut employee={employee} />
          </div>
          
          <div className="md:w-2/3">
            <TimeTracking employee={employee} />
          </div>
        </div>
        
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4">{t('common.employeeInfo')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">{t('common.employeeCode')}</p>
              <p className="font-medium">{employee.employeeCode}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">{t('common.name')}</p>
              <p className="font-medium">{employee.name}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">{t('common.email')}</p>
              <p className="font-medium">{employee.email}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">{t('common.joinedOn')}</p>
              <p className="font-medium">
                {new Date(employee.createdAt).toLocaleDateString(i18n.language)}
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 text-center text-sm text-gray-500">
            {t(' 2025 Alkhair Fish Restaurant. All rights reserved.')}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EmployeeDashboard;