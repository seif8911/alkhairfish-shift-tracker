export interface Employee {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  createdAt: string;
  // Whether the employee is currently clocked in
  active?: boolean;
  photo?: string;
}

export interface TimeRecord {
  id: number;
  employeeId: number;
  clockIn: string;
  clockOut: string | null;
  duration: number | null;
  date: string;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: Employee | AdminUser | null;
  loading: boolean;
  error: string | null;
}

export interface TimeAPIResponse {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  seconds: number;
  milliSeconds: number;
  dateTime: string;
  date: string;
  time: string;
  timeZone: string;
  dayOfWeek: string;
  dstActive: boolean;
}