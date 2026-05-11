import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../utils/helpers';

export default function CompanySettings({ user, setStatusMsg, officeSettings, setOfficeSettings, workDays, setWorkDays }) {
  const [activeSection, setActiveSection] = useState('office');
  const [editOffice, setEditOffice] = useState({ ...officeSettings });
  const [payrollSettings, setPayrollSettings] = useState({
    latePenaltyPerDay: 50000, overtimeRatePerHour: 30000, workHoursStart: 9.25, overtimeStart: 18, workingDaysPerMonth: 22, payday: 25,
  });
  const [saving, setSaving] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'employee', position: 'Staff', department: 'General' });
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => { setEditOffice({ ...officeSettings }); }, [officeSettings]);

  const fetchPayrollSettings = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/settings/payroll`);
      if (res.data.success && res.data.data) setPayrollSettings(res.data.data);
    } catch (err) { console.error('Error fetching payroll settings:', err); }
  }, []);

  useEffect(() => { fetchPayrollSettings(); }, [fetchPayrollSettings]);

  const handleSaveOffice = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/api/settings/office`, editOffice);
      if (res.data.success) {
        setOfficeSettings(res.data.data);
        setStatusMsg({ type: 'success', text: 'Office location updated!' });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err) { setStatusMsg({ type: 'error', text: 'Failed to save office settings.' }); }
    finally { setSaving(false); }
  };

  const handleSaveWorkDays = async (newDays) => {
    setWorkDays(newDays);
    try { await axios.put(`${API_URL}/api/settings/workdays`, { days: newDays }); }
    catch (err) { console.error('Error saving workdays:', err); }
  };

  const handleSavePayroll = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/api/settings/payroll`, payrollSettings);
      if (res.data.success) {
        setStatusMsg({ type: 'success', text: 'Payroll settings updated!' });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err) { setStatusMsg({ type: 'error', text: 'Failed to save payroll settings.' }); }
    finally { setSaving(false); }
  };

  const handleInviteEmployee = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.post(`${API_URL}/api/companies/${user.companyId}/invite`, inviteForm);
      if (res.data.success) {
        setShowInviteModal(false);
        setInviteForm({ name: '', email: '', role: 'employee', position: 'Staff', department: 'General' });
        setStatusMsg({ type: 'success', text: `Employee "${inviteForm.name}" invited!` });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to invite employee.' });
    } finally { setSaving(false); }
  };

  const sections = [
    { id: 'office', label: 'Office', icon: 'location_on' },
    { id: 'workdays', label: 'Work Days', icon: 'calendar_month' },
    { id: 'payroll', label: 'Payroll', icon: 'account_balance_wallet' },
    { id: 'invite', label: 'Invite', icon: 'person_add' },
  ];

  return (
    <div className="dashboard-view animate-fadeInUp">
      <div style={{ padding: '0 20px' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-icons-outlined" style={{ fontSize: '24px' }}>tune</span>
          Company Settings
          {user?.companyName && <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 400 }}>— {user.companyName}</span>}
        </h2>

        {/* Section Tabs */}
        <div className="tabs-container" style={{ marginBottom: '24px' }}>
          <div className="tabs-row">
            {sections.map(s => (
              <button key={s.id} className={`tab-item ${activeSection === s.id ? 'active' : ''}`} onClick={() => setActiveSection(s.id)}>
                <span className="material-icons-outlined">{s.icon}</span>{s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Office Location */}
        {activeSection === 'office' && (
          <div className="glass-panel animate-fadeInScale" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-icons-outlined">location_on</span> Office Location & Radius
            </h3>
            <form onSubmit={handleSaveOffice} className="edit-profile-form">
              <div className="form-group"><label>Office Name</label><input value={editOffice.name || ''} onChange={e => setEditOffice({ ...editOffice, name: e.target.value })} placeholder="e.g. Head Office" required /></div>
              <div className="form-row">
                <div className="form-group"><label>Latitude</label><input type="number" step="any" value={editOffice.lat || ''} onChange={e => setEditOffice({ ...editOffice, lat: e.target.value })} required /></div>
                <div className="form-group"><label>Longitude</label><input type="number" step="any" value={editOffice.lng || ''} onChange={e => setEditOffice({ ...editOffice, lng: e.target.value })} required /></div>
              </div>
              <div className="form-group"><label>Attendance Radius (meters)</label><input type="number" value={editOffice.radius || 100} onChange={e => setEditOffice({ ...editOffice, radius: e.target.value })} min="10" max="1000" required /></div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>💡 Tip: Open Google Maps, right-click on your office, and copy the coordinates.</p>
              <div style={{ marginTop: '16px' }}>
                <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Saving...' : 'Save Location'}</button>
              </div>
            </form>
          </div>
        )}

        {/* Work Days */}
        {activeSection === 'workdays' && (
          <div className="glass-panel animate-fadeInScale" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-icons-outlined">calendar_month</span> Working Days Configuration
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Select which days are mandatory working days. Changes are saved automatically.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                <label key={day} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer',
                  background: workDays.includes(day) ? 'linear-gradient(135deg, #eff6ff, #dbeafe)' : '#f8fafc',
                  border: workDays.includes(day) ? '1.5px solid #3b82f6' : '1px solid #e2e8f0', transition: 'all 0.2s',
                }}>
                  <input type="checkbox" checked={workDays.includes(day)}
                    onChange={(e) => {
                      const newDays = e.target.checked ? [...workDays, day] : workDays.filter(d => d !== day);
                      handleSaveWorkDays(newDays);
                    }}
                    style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: workDays.includes(day) ? 600 : 400, color: workDays.includes(day) ? '#1e40af' : '#64748b' }}>{day}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Payroll Settings */}
        {activeSection === 'payroll' && (
          <div className="glass-panel animate-fadeInScale" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-icons-outlined">account_balance_wallet</span> Payroll Configuration
            </h3>
            <form onSubmit={handleSavePayroll} className="edit-profile-form">
              <div style={{ padding: '16px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="material-icons-outlined" style={{ color: '#f59e0b', fontSize: '20px' }}>event</span>
                  <strong style={{ fontSize: '14px' }}>Payday (Tanggal Gajian)</strong>
                </div>
                <p style={{ fontSize: '12px', color: '#92400e', marginBottom: '10px' }}>The system will automatically calculate and email payslips on this date every month.</p>
                <select value={payrollSettings.payday} onChange={e => setPayrollSettings({ ...payrollSettings, payday: Number(e.target.value) })}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #f59e0b', fontSize: '14px', fontWeight: 600, background: '#fff', width: '120px' }}>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>Tanggal {d}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Late Penalty / Day (Rp)</label>
                  <input type="number" value={payrollSettings.latePenaltyPerDay} onChange={e => setPayrollSettings({ ...payrollSettings, latePenaltyPerDay: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>Overtime Rate / Hour (Rp)</label>
                  <input type="number" value={payrollSettings.overtimeRatePerHour} onChange={e => setPayrollSettings({ ...payrollSettings, overtimeRatePerHour: Number(e.target.value) })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Work Hours Start</label>
                  <input type="number" step="0.25" value={payrollSettings.workHoursStart} onChange={e => setPayrollSettings({ ...payrollSettings, workHoursStart: Number(e.target.value) })} />
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>e.g. 9.25 = 09:15</span>
                </div>
                <div className="form-group">
                  <label>Overtime Start Hour</label>
                  <input type="number" step="0.25" value={payrollSettings.overtimeStart} onChange={e => setPayrollSettings({ ...payrollSettings, overtimeStart: Number(e.target.value) })} />
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>e.g. 18 = 18:00</span>
                </div>
              </div>
              <div className="form-group">
                <label>Working Days / Month</label>
                <input type="number" value={payrollSettings.workingDaysPerMonth} onChange={e => setPayrollSettings({ ...payrollSettings, workingDaysPerMonth: Number(e.target.value) })} min="1" max="31" />
              </div>
              <div style={{ marginTop: '16px' }}>
                <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Saving...' : 'Save Payroll Settings'}</button>
              </div>
            </form>
          </div>
        )}

        {/* Invite Employee */}
        {activeSection === 'invite' && (
          <div className="glass-panel animate-fadeInScale" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-icons-outlined">person_add</span> Invite New Employee
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Invited employees will be able to log in with their personal email via Google OAuth.</p>
            <form onSubmit={handleInviteEmployee} className="edit-profile-form">
              <div className="form-group"><label>Full Name</label><input value={inviteForm.name} onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="e.g. John Doe" required /></div>
              <div className="form-group"><label>Email (Personal Gmail)</label><input type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="employee@gmail.com" required /></div>
              <div className="form-row">
                <div className="form-group"><label>Role</label>
                  <select value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}>
                    <option value="employee">Employee</option>
                    <option value="hrd">HRD</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin Company</option>
                  </select>
                </div>
                <div className="form-group"><label>Position</label><input value={inviteForm.position} onChange={e => setInviteForm({ ...inviteForm, position: e.target.value })} placeholder="e.g. Software Engineer" /></div>
              </div>
              <div className="form-group"><label>Department</label><input value={inviteForm.department} onChange={e => setInviteForm({ ...inviteForm, department: e.target.value })} placeholder="e.g. Engineering" /></div>
              <div style={{ marginTop: '16px' }}>
                <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Inviting...' : 'Send Invite'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
