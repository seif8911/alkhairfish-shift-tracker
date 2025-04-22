import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';
import ExcelJS from 'exceljs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cron from 'node-cron';

// Emulate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Force all DATE/DATETIME queries to use GMT+3 (Asia/Qatar)
  timezone: '+03:00'
});

// Ensure each connection uses Asia/Qatar timezone for NOW() and CURDATE()
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+03:00'");
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const app = express();
app.use(cors());
app.use(express.json());

// Serve employee pictures statically
const picturesDir = path.join(__dirname, 'employees_pictures');
if (!fs.existsSync(picturesDir)) fs.mkdirSync(picturesDir);
app.use('/api/employees_pictures', express.static(picturesDir));
// Support legacy path for static images
app.use('/employees_pictures', express.static(picturesDir));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, picturesDir);
  },
  filename: (req, file, cb) => {
    // Use timestamp + original name for uniqueness
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

/**
 * @route POST /api/employees/upload-photo
 * @desc Upload an employee photo. Returns { filename }
 * @access Public (should be protected in production)
 */
app.post('/api/employees/upload-photo', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ filename: req.file.filename });
});

// Ensure tables exist
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255),
      employeeCode VARCHAR(100) UNIQUE,
      photo VARCHAR(255),
      createdAt DATETIME,
      deleted BOOLEAN DEFAULT FALSE
    );
  `);
  // Ensure photo column exists if table was created before photo field was added
  try {
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'photo'`,
      [process.env.DB_NAME]
    );
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE employees ADD COLUMN photo VARCHAR(255) NULL AFTER employeeCode`);
      console.log('Added photo column to employees table');
    }
  } catch (err) {
    console.error('Error checking/adding photo column:', err);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS time_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employeeId INT,
      clockIn DATETIME,
      clockOut DATETIME,
      duration INT,
      date DATE,
      FOREIGN KEY (employeeId) REFERENCES employees(id)
    );
  `);
})().catch(console.error);

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  const { code } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM employees WHERE employeeCode = ? AND deleted = FALSE', [code]);
    const user = rows[0];
    if (user) return res.json({ isAdmin: false, user });
    res.status(401).json({ error: 'Invalid employee code' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/admin/login', (req, res) => {
  const { username, password } = req.body;
  const { ADMIN_USER, ADMIN_PASS, ADMIN_EMAIL } = process.env;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({ isAdmin: true, user: { id: 0, username, email: ADMIN_EMAIL } });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

// Employee routes
app.get('/api/employees', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT
      e.id, e.employeeCode, e.name, e.email, e.photo, e.createdAt,
      EXISTS(
        SELECT 1 FROM time_records tr
        WHERE tr.employeeId = e.id AND tr.clockOut IS NULL
      ) AS active
     FROM employees e
     WHERE deleted = FALSE`
  );
  console.log('GET /api/employees ->', rows);
  res.json(rows);
});

app.post('/api/employees', async (req, res) => {
  const { name, email, employeeCode, photo } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO employees (name, email, employeeCode, photo, createdAt) VALUES (?, ?, ?, ?, NOW())',
      [name, email, employeeCode, photo || null]
    );
    const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [(result).insertId]);
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to add employee' });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    await pool.query('UPDATE employees SET deleted = TRUE WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// Time routes
app.post('/api/time/clock-in', async (req, res) => {
  const { employeeId } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO time_records (employeeId, clockIn, date) VALUES (?, NOW(), CURDATE())',
      [employeeId]
    );
    const [rows] = await pool.query('SELECT * FROM time_records WHERE id = ?', [(result).insertId]);
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to clock in' });
  }
});

app.post('/api/time/clock-out', async (req, res) => {
  const { employeeId } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM time_records WHERE employeeId = ? AND clockOut IS NULL',
      [employeeId]
    );
    const record = rows[0];
    if (!record) return res.json(null);
    await pool.query(
      'UPDATE time_records SET clockOut = NOW(), duration = TIMESTAMPDIFF(MINUTE, clockIn, NOW()) WHERE id = ?',
      [record.id]
    );
    const [updated] = await pool.query('SELECT * FROM time_records WHERE id = ?', [record.id]);
    res.json(updated[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to clock out' });
  }
});

app.get('/api/time/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  const { date } = req.query;
  let query = 'SELECT * FROM time_records WHERE employeeId = ?';
  const params = [employeeId];
  if (date) {
    // Ensure we're comparing dates properly
    query += ' AND DATE(`date`) = DATE(?)';
    params.push(date);
  }
  const [rows] = await pool.query(query, params);
  res.json(rows);
});

// Report data endpoint
app.get('/api/time/report/:date', async (req, res) => {
  const { date } = req.params;
  const { type = 'daily', endDate: customEndDate } = req.query;
  let startDate = date, endDate = date;
  
  if (type === 'custom' && customEndDate) {
    // Custom date range
    startDate = date;
    endDate = customEndDate;
  } else if (type === 'weekly') {
    // Calculate Monday to Sunday of the week containing the selected date
    const d = new Date(date);
    const day = d.getDay();
    // Convert Sunday (0) to 7 for calculation
    const dayOfWeek = day === 0 ? 7 : day;
    // Go back to Monday
    d.setDate(d.getDate() - (dayOfWeek - 1));
    startDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    
    // Calculate Sunday
    const end = new Date(d);
    end.setDate(d.getDate() + 6);
    endDate = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
    console.log(`Weekly report from ${startDate} to ${endDate}`);
  } else if (type === 'monthly') {
    // First day of month
    const d = new Date(date + '-01');
    startDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    
    // Last day of month
    const end = new Date(d.getFullYear(), d.getMonth()+1, 0);
    endDate = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
  }
  try {
    console.log(`Report query with date range: ${startDate} to ${endDate}`);
    
    // For debugging, let's log all time records
    const [allRecords] = await pool.query(
      `SELECT tr.id, e.employeeCode, e.name, DATE_FORMAT(tr.date, '%Y-%m-%d') as date 
       FROM employees e 
       JOIN time_records tr ON e.id = tr.employeeId 
       ORDER BY tr.date ASC`
    );
    console.log('All time records:', allRecords.map(r => r.date));
    
    // Now run the actual query with the date range
    const [rows] = await pool.query(
      `SELECT e.employeeCode, e.name, DATE_FORMAT(tr.date, '%Y-%m-%d') as date, tr.clockIn, tr.clockOut, tr.duration
       FROM employees e
       JOIN time_records tr ON e.id = tr.employeeId
       WHERE DATE(tr.date) >= DATE(?) AND DATE(tr.date) <= DATE(?)
       ORDER BY tr.date ASC, e.employeeCode ASC`,
      [startDate, endDate]
    );
    
    console.log(`Found ${rows.length} records in date range`);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch report data' });
  }
});

// Email send-report
app.post('/api/email/send-report', async (req, res) => {
  const { date, type = 'daily', endDate: customEndDate } = req.body;
  let startDate = date, endDate = date;
  
  if (type === 'custom' && customEndDate) {
    // Custom date range
    startDate = date;
    endDate = customEndDate;
  } else if (type === 'weekly') {
    // Calculate Monday to Sunday of the week containing the selected date
    const d = new Date(date);
    const day = d.getDay();
    // Convert Sunday (0) to 7 for calculation
    const dayOfWeek = day === 0 ? 7 : day;
    // Go back to Monday
    d.setDate(d.getDate() - (dayOfWeek - 1));
    startDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    
    // Calculate Sunday
    const end = new Date(d);
    end.setDate(d.getDate() + 6);
    endDate = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
    console.log(`Email weekly report from ${startDate} to ${endDate}`);
  } else if (type === 'monthly') {
    // First day of month
    const d = new Date(date + '-01');
    startDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    
    // Last day of month
    const end = new Date(d.getFullYear(), d.getMonth()+1, 0);
    endDate = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
  }
  try {
    console.log(`Email report query with date range: ${startDate} to ${endDate}`);
    
    const [rows] = await pool.query(
      `SELECT e.employeeCode, e.name, DATE_FORMAT(tr.date, '%Y-%m-%d') as date, tr.clockIn, tr.clockOut, tr.duration
       FROM employees e
       JOIN time_records tr ON e.id = tr.employeeId
       WHERE DATE(tr.date) >= DATE(?) AND DATE(tr.date) <= DATE(?)
       ORDER BY tr.date ASC, e.employeeCode ASC`,
      [startDate, endDate]
    );
    
    console.log(`Found ${rows.length} records for email report`);
    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Time Report');
    sheet.columns = [
      { header: 'Employee Code', key: 'employeeCode', width: 15 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Date', key: 'date', width: 15, style: { numFmt: 'yyyy-mm-dd' } },
      { header: 'Day', key: 'day', width: 15 },
      { header: 'Clock In', key: 'clockIn', width: 12 },
      { header: 'Clock Out', key: 'clockOut', width: 12 },
      { header: 'Total Hours', key: 'totalHours', width: 12 }
    ];
    // Style header row
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.alignment = { horizontal: 'center' };
    });
    if (rows.length === 0) {
      sheet.addRow({ employeeCode: '', name: 'No activity', date: '', day: '', clockIn: '', clockOut: '', totalHours: '' });
    } else {
      rows.forEach(r => {
        const day = new Date(r.date).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Riyadh' });
        const clockInStr = r.clockIn ? new Date(r.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Riyadh' }) : '';
        const clockOutStr = r.clockOut ? new Date(r.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Riyadh' }) : '';
        const h = Math.floor(r.duration / 60);
        const m = r.duration % 60;
        const totalHoursStr = r.duration != null ? `${h}h ${m.toString().padStart(2, '0')}m` : '';
        sheet.addRow({ employeeCode: r.employeeCode, name: r.name, date: new Date(r.date), day, clockIn: clockInStr, clockOut: clockOutStr, totalHours: totalHoursStr });
      });
    }
    // Shade alternate rows
    sheet.eachRow((row, idx) => {
      if (idx > 1 && idx % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        });
      }
    });
    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();
    // Send email with attachment
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `Time Report for ${date} (${type})`,
      attachments: [{ filename: `TimeReport-${date}-${type}.xlsx`, content: buffer }]
    });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to send report' });
  }
});

// Active record status endpoint
app.get('/api/time/active/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM time_records WHERE employeeId = ? AND clockOut IS NULL',
      [employeeId]
    );
    res.json(rows.length > 0);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch active status' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

// Schedule daily report email at 1:30 AM AST
cron.schedule('30 1 * * *', async () => {
  try {
    // Prepare date for report (yesterday)
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    console.log(`Scheduled daily report for ${date}`);
    // Query data
    const [rows] = await pool.query(
      `SELECT e.employeeCode, e.name, DATE_FORMAT(tr.date, '%Y-%m-%d') as date, tr.clockIn, tr.clockOut, tr.duration
       FROM employees e
       JOIN time_records tr ON e.id = tr.employeeId
       WHERE DATE(tr.date) = DATE(?)
       ORDER BY tr.date ASC, e.employeeCode ASC`,
      [date]
    );
    // Build Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Time Report');
    sheet.columns = [
      { header: 'Employee Code', key: 'employeeCode', width: 15 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Day', key: 'day', width: 15 },
      { header: 'Clock In', key: 'clockIn', width: 12 },
      { header: 'Clock Out', key: 'clockOut', width: 12 },
      { header: 'Total Hours', key: 'totalHours', width: 12 }
    ];
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.alignment = { horizontal: 'center' };
    });
    if (rows.length === 0) {
      sheet.addRow({ employeeCode: '', name: 'No activity', date: '', day: '', clockIn: '', clockOut: '', totalHours: '' });
    } else {
      rows.forEach(r => {
        const day = new Date(r.date).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Qatar' });
        const clockInStr = r.clockIn ? new Date(r.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Qatar' }) : '';
        const clockOutStr = r.clockOut ? new Date(r.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Qatar' }) : '';
        const h = Math.floor(r.duration / 60);
        const m = r.duration % 60;
        const totalHoursStr = r.duration != null ? `${h}h ${m.toString().padStart(2, '0')}m` : '';
        sheet.addRow({ employeeCode: r.employeeCode, name: r.name, date: new Date(r.date), day, clockIn: clockInStr, clockOut: clockOutStr, totalHours: totalHoursStr });
      });
    }
    sheet.eachRow((row, idx) => {
      if (idx > 1 && idx % 2 === 0) row.eachCell(cell => cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.ADMIN_EMAIL || 'alkhairfish.shift.tracker@gmail.com',
      subject: `Time Report for ${date} (daily)`,
      attachments: [{ filename: `TimeReport-${date}.xlsx`, content: buffer }]
    });
    console.log('Scheduled daily report sent');
  } catch (e) {
    console.error('Scheduled report error:', e);
  }
}, { timezone: 'Asia/Qatar' });
