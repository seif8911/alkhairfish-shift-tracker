import React, { useState } from 'react';
import { AdminUser, Employee } from '../../types';
import AddEmployee from './AddEmployee';
import EmployeeList from './EmployeeList';
import Reports from './Reports';
import { LogOut, User, FileText, ChevronDown } from 'lucide-react';

interface AdminDashboardProps {
  admin: AdminUser;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ admin, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'add' | 'reports'>('employees');
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  const handleAddEmployee = (employee: Employee) => {
    // In a real app, this would call an API to add the employee
    console.log('Adding employee:', employee);
    // After adding, switch to the employees tab to show the updated list
    setActiveTab('employees');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-800">Admin Dashboard</h1>
            </div>
            
            <div className="flex items-center">
              <div className="hidden md:flex items-center mr-4">
                <User className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-700">{admin.username}</span>
              </div>
              
              <button
                onClick={onLogout}
                className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors duration-200"
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile menu */}
        <div className="block md:hidden mb-6">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-full flex items-center justify-between bg-white p-4 rounded-md shadow-sm"
          >
            <span className="font-medium">
              {activeTab === 'employees' ? 'Employee Directory' : 
               activeTab === 'add' ? 'Add Employee' : 'Reports'}
            </span>
            <ChevronDown className={`h-5 w-5 transition-transform ${menuOpen ? 'transform rotate-180' : ''}`} />
          </button>
          
          {menuOpen && (
            <div className="mt-2 bg-white rounded-md shadow-md overflow-hidden">
              <button
                onClick={() => { setActiveTab('employees'); setMenuOpen(false); }}
                className={`w-full text-left p-4 flex items-center ${activeTab === 'employees' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}
              >
                <User className="h-5 w-5 mr-2" />
                <span>Employee Directory</span>
              </button>
              
              <button
                onClick={() => { setActiveTab('add'); setMenuOpen(false); }}
                className={`w-full text-left p-4 flex items-center ${activeTab === 'add' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}
              >
                <User className="h-5 w-5 mr-2" />
                <span>Add Employee</span>
              </button>
              
              <button
                onClick={() => { setActiveTab('reports'); setMenuOpen(false); }}
                className={`w-full text-left p-4 flex items-center ${activeTab === 'reports' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}
              >
                <FileText className="h-5 w-5 mr-2" />
                <span>Reports</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Desktop tabs */}
        <div className="hidden md:flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-6 py-3 font-medium flex items-center border-b-2 ${
              activeTab === 'employees' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <User className="h-5 w-5 mr-2" />
            <span>Employee Directory</span>
          </button>
          
          <button
            onClick={() => setActiveTab('add')}
            className={`px-6 py-3 font-medium flex items-center border-b-2 ${
              activeTab === 'add' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <User className="h-5 w-5 mr-2" />
            <span>Add Employee</span>
          </button>
          
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-3 font-medium flex items-center border-b-2 ${
              activeTab === 'reports' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="h-5 w-5 mr-2" />
            <span>Reports</span>
          </button>
        </div>
        
        <div className="w-full">
          {activeTab === 'employees' && <EmployeeList />}
          {activeTab === 'add' && <AddEmployee onAddEmployee={handleAddEmployee} />}
          {activeTab === 'reports' && <Reports />}
        </div>
      </div>
      
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 text-center text-sm text-gray-500">
            2025 Alkhair Fish Restaurant. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminDashboard;