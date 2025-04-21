import { Employee, TimeRecord, AdminUser } from '../types';

const API_BASE = '/api';

// Auth
export async function loginEmployee(code: string): Promise<{ isAdmin: boolean; user: Employee }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
  return res.json();
}

export async function loginAdmin(username: string, password: string): Promise<{ isAdmin: boolean; user: AdminUser }> {
  const res = await fetch(`${API_BASE}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Admin login failed');
  return res.json();
}

// Employees
export async function fetchEmployees(): Promise<Employee[]> {
  const res = await fetch(`${API_BASE}/employees`);
  if (!res.ok) throw new Error('Failed to fetch employees');
  return res.json();
}

export async function addEmployeeApi(employee: Omit<Employee, 'id' | 'createdAt'>): Promise<Employee> {
  const res = await fetch(`${API_BASE}/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(employee),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to add employee');
  return res.json();
}

export async function deleteEmployeeApi(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/employees/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete');
}

// Time records
export async function fetchTimeRecordsApi(employeeId: number, date?: string): Promise<TimeRecord[]> {
  let url = `${API_BASE}/time/${employeeId}`;
  if (date) {
    url += `?date=${date}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch time records');
  return res.json();
}

export async function clockInApi(employeeId: number): Promise<TimeRecord> {
  const res = await fetch(`${API_BASE}/time/clock-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Clock-in failed');
  return res.json();
}

export async function clockOutApi(employeeId: number): Promise<TimeRecord | null> {
  const res = await fetch(`${API_BASE}/time/clock-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Clock-out failed');
  return res.json();
}

// Reports
export async function generateReportDataApi(date: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/time/report/${date}`);
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch report');
  return res.json();
}

export async function sendReportEmailApi(date: string): Promise<void> {
  const res = await fetch(`${API_BASE}/email/send-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to send report');
}

// Check if employee is currently clocked in
export async function isEmployeeActiveApi(employeeId: number): Promise<boolean> {
  const res = await fetch(`${API_BASE}/time/active/${employeeId}`);
  if (!res.ok) throw new Error('Failed to fetch active status');
  return res.json();
}
