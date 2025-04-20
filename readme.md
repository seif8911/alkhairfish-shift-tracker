# AlKhair Fish Shift Tracker

A time‐tracking web application for AlKhair Fish Restaurant. Employees can clock in/out and view their hours, while administrators can manage employees, generate/download reports, and schedule daily email reports.

## Features

- Employee login by code
- Clock in/out with AST timezone support
- View historical time records
- Admin panel to add/delete employees
- Generate, download, and email daily/weekly/monthly Excel reports
- Scheduled nightly reports via email
- Bilingual UI (English & Arabic)

## Tech Stack

- Front‑end: React, TypeScript, Vite, Tailwind CSS, i18next
- Back‑end: Node.js, Express, MySQL (with timezone set to Asia/Qatar)
- Email: nodemailer (using SMTP relay)

## Prerequisites

- Node.js v16+ & npm
- MySQL server

## Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/seif8911/alkhairfish-shift-tracker.git
   cd alkhairfish-shift-tracker
   ```
2. Install dependencies:
   ```bash
   npm install       # front‑end
   cd server && npm install  # back‑end
   ```
3. Create a `.env` in `/server`:
   ```dotenv
   DB_HOST=your-db-host
   DB_PORT=3306
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password
   DB_NAME=timetracker

   SMTP_HOST=your-smtp-host
   SMTP_PORT=587
   SMTP_USER=your-smtp-user
   SMTP_PASS=your-smtp-pass
   SMTP_FROM="Shift Tracker <noreply@your-domain.com>"

   ADMIN_USER=admin
   ADMIN_PASS=adminpass
   ADMIN_EMAIL=admin@example.com
   ```
4. Ensure database tables are created automatically on server start.

## Running the App

- **Back‑end** (runs on port 3000):
  ```bash
  cd server
  npm run start   # or node app.js
  ```

- **Front‑end** (runs on port 5173):
  ```bash
  npm run dev
  ```

Visit `http://localhost:5173` to log in as an employee, or `http://localhost:5173/admin` for the admin panel.

## Reports

- Manual: use the “Download Report” button in the admin panel.
- Email: click “Send by Email” or rely on automatic nightly schedule (midnight AST).

## Localization

Switch between English and Arabic at any time via the language toggle.

## License

MIT