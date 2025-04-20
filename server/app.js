import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';
import ExcelJS from 'exceljs';

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

// Ensure tables exist
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255),
      employeeCode VARCHAR(100) UNIQUE,
      createdAt DATETIME,
      deleted BOOLEAN DEFAULT FALSE
    );
  `);
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
      e.id, e.employeeCode, e.name, e.email, e.createdAt,
      EXISTS(
        SELECT 1 FROM time_records tr
        WHERE tr.employeeId = e.id AND tr.clockOut IS NULL
      ) AS active
     FROM employees e
     WHERE deleted = FALSE`
  );
  res.json(rows);
});

app.post('/api/employees', async (req, res) => {
  const { name, email, employeeCode } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO employees (name, email, employeeCode, createdAt) VALUES (?, ?, ?, NOW())',
      [name, email, employeeCode]
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
  const [rows] = await pool.query('SELECT * FROM time_records WHERE employeeId = ?', [req.params.employeeId]);
  res.json(rows);
});

// Report data endpoint
app.get('/api/time/report/:date', async (req, res) => {
  const { date } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT e.name, tr.date, tr.clockIn, tr.clockOut, tr.duration
       FROM employees e
       JOIN time_records tr ON e.id = tr.employeeId
       WHERE tr.date = ?`,
      [date]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch report data' });
  }
});

// Email send-report
app.post('/api/email/send-report', async (req, res) => {
  const { date } = req.body;
  try {
    // Fetch records with employee code
    const [rows] = await pool.query(
      `SELECT e.employeeCode, e.name, tr.date, tr.clockIn, tr.clockOut, tr.duration
       FROM employees e
       JOIN time_records tr ON e.id = tr.employeeId
       WHERE tr.date = ?`,
      [date]
    );
    if (!rows.length) return res.status(404).json({ error: 'No records for this date' });

    // Create Excel workbook
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
    // Style header row
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.alignment = { horizontal: 'center' };
    });
    // Add data rows
    rows.forEach(r => {
      const day = new Date(r.date).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Riyadh' });
      const clockInStr = r.clockIn ? new Date(r.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Riyadh' }) : '';
      const clockOutStr = r.clockOut ? new Date(r.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Riyadh' }) : '';
      const h = Math.floor(r.duration / 60);
      const m = r.duration % 60;
      const totalHoursStr = `${h}h ${m.toString().padStart(2, '0')}m`;
      sheet.addRow({ employeeCode: r.employeeCode, name: r.name, date: r.date, day, clockIn: clockInStr, clockOut: clockOutStr, totalHours: totalHoursStr });
    });
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
      subject: `Time Report for ${date}`,
      attachments: [{ filename: `TimeReport-${date}.xlsx`, content: buffer }]
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
