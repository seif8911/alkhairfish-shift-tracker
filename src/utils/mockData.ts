import { Employee, TimeRecord, AdminUser, TimeAPIResponse } from '../types';

// Mock data storage in localStorage to persist between sessions
const getStoredEmployees = (): Employee[] => {
  const stored = localStorage.getItem('employees');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse stored employees:', e);
      localStorage.removeItem('employees');
    }
  }
  return [];
};

const getStoredTimeRecords = (): TimeRecord[] => {
  const stored = localStorage.getItem('timeRecords');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse stored time records:', e);
      localStorage.removeItem('timeRecords');
    }
  }
  return [];
};

const getStoredDeletedEmployees = (): Set<number> => {
  const stored = localStorage.getItem('deletedEmployees');
  if (stored) {
    try {
      return new Set(JSON.parse(stored));
    } catch (e) {
      console.error('Failed to parse deleted employees:', e);
      localStorage.removeItem('deletedEmployees');
    }
  }
  return new Set();
};

// Initialize data
let employees: Employee[] = getStoredEmployees();
let timeRecords: TimeRecord[] = getStoredTimeRecords();
let deletedEmployees: Set<number> = getStoredDeletedEmployees();

// Save data to localStorage
const saveEmployees = () => {
  localStorage.setItem('employees', JSON.stringify(employees));
};

const saveTimeRecords = () => {
  localStorage.setItem('timeRecords', JSON.stringify(timeRecords));
};

const saveDeletedEmployees = () => {
  localStorage.setItem('deletedEmployees', JSON.stringify(Array.from(deletedEmployees)));
};

// Get Qatar time from TimeAPI.io
export const getQatarTime = async (): Promise<Date> => {
  try {
    const response = await fetch('https://timeapi.io/api/time/current/zone?timeZone=Asia/Qatar');
    if (!response.ok) {
      throw new Error('Failed to fetch time');
    }
    const data: TimeAPIResponse = await response.json();
    return new Date(data.dateTime);
  } catch (error) {
    console.error('Error fetching Qatar time:', error);
    // Fallback to local calculation if API fails
    const qatarString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Qatar' });
    return new Date(qatarString);
  }
};

// Format Qatar time
export const formatQatarTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Qatar',
    hour12: true,
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format duration
const formatDuration = (minutes: number | null): string => {
  if (!minutes) return '--';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
};

// Get day name
const getDayName = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

// Function to add a new employee
export const addEmployee = async (employee: Omit<Employee, 'id' | 'createdAt'>): Promise<Employee> => {
  // Check if employee code already exists
  const existingEmployee = employees.find(emp => 
    emp.employeeCode === employee.employeeCode && !deletedEmployees.has(emp.id)
  );
  
  if (existingEmployee) {
    throw new Error('Employee code already exists');
  }

  const now = await getQatarTime();
  const newEmployee: Employee = {
    id: Math.max(0, ...employees.map(e => e.id), 0) + 1,
    ...employee,
    createdAt: now.toISOString()
  };
  
  employees = [...employees, newEmployee];
  saveEmployees();
  return newEmployee;
};

// Function to delete an employee
export const deleteEmployee = (id: number): void => {
  // Keep the employee record but mark as deleted
  deletedEmployees.add(id);
  saveDeletedEmployees();
};

// Function to get employee by code
export const getEmployeeByCode = (code: string): Employee | undefined => {
  return employees.find(emp => emp.employeeCode === code && !deletedEmployees.has(emp.id));
};

// Function to check if employee is clocked in
export const isEmployeeClockgedIn = (employeeId: number): boolean => {
  const record = timeRecords.find(
    rec => rec.employeeId === employeeId && rec.clockOut === null
  );
  return !!record;
};

// Function to clock in employee
export const clockInEmployee = async (employeeId: number): Promise<TimeRecord> => {
  const now = await getQatarTime();
  const newRecord: TimeRecord = {
    id: Math.max(0, ...timeRecords.map(r => r.id), 0) + 1,
    employeeId,
    clockIn: now.toISOString(),
    clockOut: null,
    duration: null,
    date: now.toISOString().split('T')[0]
  };
  
  timeRecords = [...timeRecords, newRecord];
  saveTimeRecords();
  return newRecord;
};

// Function to clock out employee
export const clockOutEmployee = async (employeeId: number): Promise<TimeRecord | null> => {
  const activeRecord = timeRecords.find(
    rec => rec.employeeId === employeeId && rec.clockOut === null
  );
  
  if (!activeRecord) return null;
  
  const now = await getQatarTime();
  const clockIn = new Date(activeRecord.clockIn);
  const durationMinutes = Math.floor((now.getTime() - clockIn.getTime()) / 60000);
  
  const updatedRecord: TimeRecord = {
    ...activeRecord,
    clockOut: now.toISOString(),
    duration: durationMinutes
  };
  
  timeRecords = timeRecords.map(rec => 
    rec.id === activeRecord.id ? updatedRecord : rec
  );
  
  saveTimeRecords();
  return updatedRecord;
};

// Function to get employee's time records
export const getEmployeeTimeRecords = (employeeId: number): TimeRecord[] => {
  return timeRecords.filter(rec => rec.employeeId === employeeId);
};

// Function to get active time record for employee
export const getActiveTimeRecord = (employeeId: number): TimeRecord | undefined => {
  return timeRecords.find(
    rec => rec.employeeId === employeeId && rec.clockOut === null
  );
};

// Function to get all employees (excluding deleted)
export const getAllEmployees = (): Employee[] => {
  return employees.filter(emp => !deletedEmployees.has(emp.id));
};

// Function to generate report data
export const generateReportData = (date: string): any[] => {
  const records = timeRecords.filter(record => record.date === date);
  
  return records.map(record => {
    const employee = employees.find(emp => emp.id === record.employeeId);
    if (!employee || deletedEmployees.has(employee.id)) return null;

    return {
      'Employee Code': employee.employeeCode,
      'Name': employee.name,
      'Date': record.date,
      'Day': getDayName(record.date),
      'Clock In': (new Date(record.clockIn)),
      'Clock Out': record.clockOut ? (new Date(record.clockOut)) : '--',
      'Total Hours': formatDuration(record.duration)
    };
  }).filter(record => record !== null);
};

// Mock admin user data
export const adminUsers: AdminUser[] = [
  {
    id: 1,
    username: 'admin',
    email: 'alkhairfish.shift.tracker@gmail.com'
  }
];