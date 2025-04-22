import React, { useState, useEffect } from 'react';
import { FileText, Download, Send } from 'lucide-react';
import { generateReportDataApi, sendReportEmailApi } from '../../utils/api';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const Reports: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isEmailSent, setIsEmailSent] = useState<boolean>(false);

  // Schedule daily email at midnight AST
  useEffect(() => {
    const astOffsetMs = 3 * 60 * 60 * 1000;
    const schedule = () => {
      const now = Date.now();
      const astDate = new Date(now + astOffsetMs);
      const nextMidnightUtcMs = Date.UTC(astDate.getUTCFullYear(), astDate.getUTCMonth(), astDate.getUTCDate() + 1, 0, 0, 0) - astOffsetMs;
      const delay = nextMidnightUtcMs - now;
      setTimeout(async () => {
        try {
          const astNow = new Date(Date.now() + astOffsetMs);
          const dateStr = astNow.toISOString().split('T')[0];
          await sendReportEmailApi(dateStr, 'daily');
          console.log(`Scheduled report sent to alkhairfish.shift.tracker@gmail.com for ${dateStr}`);
        } catch (err) {
          console.error('Scheduled report error:', err);
        }
        schedule();
      }, delay);
    };
    schedule();
  }, []);

  const generateReport = async () => {
    setIsGenerating(true);
    setIsEmailSent(false);
    try {
      const reportData = await generateReportDataApi(
        selectedDate, 
        reportType, 
        reportType === 'custom' ? endDate : undefined
      );
      // Generate Excel workbook
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Time Report');
      sheet.columns = [
        { header: 'Employee Code', key: 'employeeCode', width: 15 },
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Date', key: 'date', width: 15, style: { numFmt: 'yyyy-mm-dd' } },
        { header: 'Day', key: 'day', width: 15 },
        { header: 'Clock In', key: 'clockIn', width: 12 },
        { header: 'Clock Out', key: 'clockOut', width: 12 },
        { header: 'Total Hours', key: 'totalHours', width: 12 },
      ];
      // Style header row
      sheet.getRow(1).eachCell((cell: any) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.alignment = { horizontal: 'center' };
      });
      if (!reportData.length) {
        sheet.addRow({ employeeCode: '', name: 'No activity', date: null, day: '', clockIn: '', clockOut: '', totalHours: '' });
      } else {
        reportData.forEach(r => {
          // For Excel, we need to add 1 day to compensate for timezone issues
          // This ensures the date shown in Excel matches the actual date from the database
          const dateParts = r.date.split('-');
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
          const day = parseInt(dateParts[2]);
          
          // Create date object with time set to noon to avoid timezone issues
          const dateObj = new Date(Date.UTC(year, month, day, 12, 0, 0));
          
          // Get day of week
          const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Riyadh' });
          
          const clockInStr = r.clockIn ? new Date(r.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Riyadh' }) : '';
          const clockOutStr = r.clockOut ? new Date(r.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Riyadh' }) : '';
          const h = Math.floor(r.duration / 60);
          const m = r.duration % 60;
          const totalHoursStr = r.duration != null ? `${h}h ${m.toString().padStart(2, '0')}m` : '';
          
          sheet.addRow({ employeeCode: r.employeeCode, name: r.name, date: dateObj, day: dayOfWeek, clockIn: clockInStr, clockOut: clockOutStr, totalHours: totalHoursStr });
        });
      }
      // Shade alternate rows
      sheet.eachRow((row: any, idx: number) => {
        if (idx > 1 && idx % 2 === 0) {
          row.eachCell((cell: any) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
          });
        }
      });
      // Export .xlsx
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      // Create appropriate filename based on report type
      let filename;
      if (reportType === 'custom') {
        filename = `time-report-${selectedDate}-to-${endDate}.xlsx`;
      } else {
        filename = `time-report-${selectedDate}-${reportType}.xlsx`;
      }
      saveAs(blob, filename);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const sendReportByEmail = async () => {
    setIsEmailSent(false);
    try {
      await sendReportEmailApi(
        selectedDate, 
        reportType, 
        reportType === 'custom' ? endDate : undefined
      );
      setIsEmailSent(true);
      alert('Report has been sent to alkhairfish.shift.tracker@gmail.com');
    } catch (error) {
      console.error('Error sending report:', error);
      alert('Failed to send report');
    }
  };


  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-6 bg-purple-600 text-white">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Time Reports</h2>
          <FileText className="h-6 w-6" />
        </div>
        <p className="mt-2 text-sm opacity-80">
          Generate and export time tracking reports
        </p>
      </div>
      
      <div className="px-6 py-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Report Type
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setReportType('daily')}
              className={`px-4 py-2 rounded-md font-medium ${
                reportType === 'daily'
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Daily
            </button>
            
            {/* <button
              onClick={() => setReportType('weekly')}
              className={`px-4 py-2 rounded-md font-medium ${
                reportType === 'weekly'
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Weekly
            </button> */}
            
            <button
              onClick={() => setReportType('monthly')}
              className={`px-4 py-2 rounded-md font-medium ${
                reportType === 'monthly'
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Monthly
            </button>

            <button
              onClick={() => setReportType('custom')}
              className={`px-4 py-2 rounded-md font-medium ${
                reportType === 'custom'
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Custom Range
            </button>
          </div>
        </div>
        
        <div className="mb-6">
          <label htmlFor="report-date" className="block text-sm font-medium text-gray-700 mb-2">
            {reportType === 'daily' ? 'Select Date' :
             reportType === 'weekly' ? 'Select Week Starting' :
             reportType === 'monthly' ? 'Select Month' :
             'Select Start Date'}
          </label>
          <input
            id="report-date"
            type={reportType === 'monthly' ? 'month' : 'date'}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {reportType === 'custom' && (
          <div className="mb-6">
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
              Select End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        )}
        
        <div className="flex flex-col md:flex-row gap-4">
          <button
            onClick={generateReport}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center gap-2"
            disabled={isGenerating}
          >
            <Download className="h-5 w-5" />
            <span>{isGenerating ? 'Generating...' : 'Download Report'}</span>
          </button>
          
          <button
            onClick={sendReportByEmail}
            className={`flex-1 font-medium py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center gap-2 ${
              isEmailSent
                ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800 focus:ring-gray-500'
            }`}
            disabled={isGenerating}
          >
            <Send className="h-5 w-5" />
            <span>{isEmailSent ? 'Email Sent!' : 'Send by Email'}</span>
          </button>
        </div>
        
        <div className="mt-6 bg-gray-50 p-4 rounded-md">
          <h3 className="font-medium text-gray-700 mb-2">Scheduled Reports</h3>
          <p className="text-sm text-gray-600">
            Daily reports are automatically generated at midnight (Qatar Time, GMT+3) and sent to alkhairfish.shift.tracker@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
};

export default Reports;