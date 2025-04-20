import React, { useState, useEffect } from 'react';
import { Clock, Mail, User } from 'lucide-react';
import { Employee } from '../../types';
import { fetchEmployees, deleteEmployeeApi } from '../../utils/api';

interface EmployeeListProps {
  onDeleteEmployee?: (id: number) => void;
}

const EmployeeList: React.FC<EmployeeListProps> = ({ onDeleteEmployee }) => {
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    fetchEmployees()
      .then(setEmployeeList)
      .catch(console.error);
  }, []);

  const filteredEmployees = employeeList.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await deleteEmployeeApi(id);
      const updated = await fetchEmployees();
      setEmployeeList(updated);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-6 bg-blue-600 text-white">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Employee Directory</h2>
          <User className="h-6 w-6" />
        </div>
        <p className="mt-2 text-sm opacity-80">
          Manage all employees in the system
        </p>
      </div>
      
      <div className="px-6 py-6">
        <div className="mb-6">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Search Employees
          </label>
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Search by name, code, or email"
          />
        </div>
        
        {filteredEmployees.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredEmployees.map((employee) => {
              const isActive = employee.active;
              
              return (
                <div key={employee.id} className="py-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-800">{employee.name}</h3>
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full font-medium ${
                          isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {isActive ? 'Clocked In' : 'Clocked Out'}
                        </span>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center text-gray-500">
                          <User className="h-4 w-4 mr-1" />
                          <span>{employee.employeeCode}</span>
                        </div>
                        
                        <div className="flex items-center text-gray-500">
                          <Mail className="h-4 w-4 mr-1" />
                          <span>{employee.email}</span>
                        </div>
                        
                        <div className="flex items-center text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Added on {new Date(employee.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <button
                        onClick={() => handleDelete(employee.id)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-500">No employees found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeList;