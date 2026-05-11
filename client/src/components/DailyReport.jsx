import React, { useState, useEffect } from 'react';
import { getInitials } from '../utils/helpers';

export default function DailyReport({
  dailyReports, isFetchingDaily, dailyDate, setDailyDate, fetchDailyReports
}) {
  const [slideDir, setSlideDir] = useState('');

  // Reset animation class after it plays
  useEffect(() => {
    if (slideDir) {
      const timer = setTimeout(() => setSlideDir(''), 400);
      return () => clearTimeout(timer);
    }
  }, [slideDir]);

  const formatTime = (ts) => {
    if (!ts) return null;
    return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
  };

  const presentCount = dailyReports.filter(r => r.status !== 'absent').length;
  const lateCount = dailyReports.filter(r => r.isLate).length;
  const completeCount = dailyReports.filter(r => r.status === 'complete').length;
  const absentCount = dailyReports.filter(r => r.status === 'absent').length;

  const dateObj = new Date(dailyDate + 'T12:00:00');
  const formattedDate = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const getStatusConfig = (status, isLate) => {
    if (status === 'complete' && !isLate) return { label: 'Complete', icon: 'check_circle', className: 'daily-status-complete' };
    if (status === 'complete' && isLate) return { label: 'Late', icon: 'warning', className: 'daily-status-late' };
    if (status === 'working' && !isLate) return { label: 'Working', icon: 'work', className: 'daily-status-working' };
    if (status === 'working' && isLate) return { label: 'Late (Working)', icon: 'warning', className: 'daily-status-late' };
    return { label: 'Absent', icon: 'cancel', className: 'daily-status-absent' };
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Position', 'Department', 'Clock In', 'Clock Out', 'Work Hours', 'Status', 'Late'];
    const rows = dailyReports.map(r => [
      r.name, r.position, r.department,
      r.clockIn ? formatTime(r.clockIn) : '-',
      r.clockOut ? formatTime(r.clockOut) : '-',
      r.workHours,
      r.status === 'complete' ? 'Complete' : r.status === 'working' ? 'Working' : 'Absent',
      r.isLate ? 'Yes' : 'No'
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Daily_Attendance_${dailyDate}.csv`);
    link.click();
  };

  const handlePrevDay = () => {
    setSlideDir('slide-right');
    const d = new Date(dailyDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    const newDate = d.toLocaleDateString('en-CA');
    setDailyDate(newDate);
    fetchDailyReports(newDate);
  };

  const handleNextDay = () => {
    setSlideDir('slide-left');
    const d = new Date(dailyDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const newDate = d.toLocaleDateString('en-CA');
    setDailyDate(newDate);
    fetchDailyReports(newDate);
  };

  return (
    <div className="daily-report-view animate-fadeInUp">
      {/* Header */}
      <div className="daily-report-header">
        <div className="daily-report-title-section">
          <h3>Daily Attendance Report</h3>
          <p className="daily-report-subtitle">{formattedDate}</p>
        </div>
        <div className="daily-report-controls">
          <div className="daily-date-nav">
            <button className="daily-nav-btn" onClick={handlePrevDay} title="Previous Day">
              <span className="material-icons-outlined">chevron_left</span>
            </button>
            <input
              type="date"
              value={dailyDate}
              onChange={e => { 
                setSlideDir(e.target.value > dailyDate ? 'slide-left' : 'slide-right');
                setDailyDate(e.target.value); 
                fetchDailyReports(e.target.value); 
              }}
              className="daily-date-input"
            />
            <button className="daily-nav-btn" onClick={handleNextDay} title="Next Day">
              <span className="material-icons-outlined">chevron_right</span>
            </button>
          </div>
          <button className="btn-export-csv" onClick={handleExportCSV}>
            <span className="material-icons-outlined">download</span> Export CSV
          </button>
        </div>
      </div>

      <div className={`daily-content-wrapper ${slideDir} ${isFetchingDaily ? 'daily-loading-overlay' : ''}`}>
        {/* Summary Cards */}
        <div className="daily-summary-grid" key={dailyDate + '-summary'}>
          <div className="daily-summary-card daily-summary-present">
            <div className="daily-summary-icon"><span className="material-icons-outlined">groups</span></div>
            <div className="daily-summary-info">
              <span className="daily-summary-number">{presentCount}</span>
              <span className="daily-summary-label">Present</span>
            </div>
          </div>
          <div className="daily-summary-card daily-summary-complete">
            <div className="daily-summary-icon"><span className="material-icons-outlined">check_circle</span></div>
            <div className="daily-summary-info">
              <span className="daily-summary-number">{completeCount}</span>
              <span className="daily-summary-label">Complete</span>
            </div>
          </div>
          <div className="daily-summary-card daily-summary-late">
            <div className="daily-summary-icon"><span className="material-icons-outlined">schedule</span></div>
            <div className="daily-summary-info">
              <span className="daily-summary-number">{lateCount}</span>
              <span className="daily-summary-label">Late</span>
            </div>
          </div>
          <div className="daily-summary-card daily-summary-absent">
            <div className="daily-summary-icon"><span className="material-icons-outlined">person_off</span></div>
            <div className="daily-summary-info">
              <span className="daily-summary-number">{absentCount}</span>
              <span className="daily-summary-label">Absent</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="daily-report-table-container">
          {isFetchingDaily && <div className="loading-bar-top"></div>}
          <table className="daily-report-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Work Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dailyReports.length === 0 ? (
                <tr><td colSpan="5" className="daily-empty-state">No employees found.</td></tr>
              ) : (
                dailyReports.map(report => {
                  const statusConfig = getStatusConfig(report.status, report.isLate);
                  return (
                    <tr key={report.id} className={`daily-row daily-row-${report.status}`}>
                      <td>
                        <div className="daily-employee-cell">
                          {report.profilePicture ? (
                            <img src={report.profilePicture} alt="" referrerPolicy="no-referrer" className="daily-avatar" />
                          ) : (
                            <div className="daily-avatar-placeholder">{getInitials(report.name)}</div>
                          )}
                          <div className="daily-employee-info">
                            <span className="daily-employee-name">{report.name}</span>
                            <span className="daily-employee-position">{report.position}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {report.clockIn ? (
                          <div className="daily-time-cell">
                            <span className="daily-time-badge in">
                              <span className="material-icons-outlined">login</span>
                              {formatTime(report.clockIn)}
                            </span>
                            {report.isLate && <span className="daily-late-tag">LATE</span>}
                          </div>
                        ) : (
                          <span className="daily-no-record">—</span>
                        )}
                      </td>
                      <td>
                        {report.clockOut ? (
                          <span className="daily-time-badge out">
                            <span className="material-icons-outlined">logout</span>
                            {formatTime(report.clockOut)}
                          </span>
                        ) : (
                          <span className="daily-no-record">—</span>
                        )}
                      </td>
                      <td>
                        {parseFloat(report.workHours) > 0 ? (
                          <span className="daily-hours-badge">{report.workHours}h</span>
                        ) : (
                          <span className="daily-no-record">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`daily-status-badge ${statusConfig.className}`}>
                          <span className="material-icons-outlined">{statusConfig.icon}</span>
                          {statusConfig.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
