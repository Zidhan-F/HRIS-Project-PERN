import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL, getInitials } from '../utils/helpers';

export default function CompanyManagement({ user, setStatusMsg }) {
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState({ totalCompanies: 0, totalEmployees: 0, activeCompanies: 0 });
  const [loading, setLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyEmployees, setCompanyEmployees] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', code: '', address: '', phone: '', email: '' });
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'employee', position: 'Staff', department: 'General' });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/companies`);
      if (res.data.success) setCompanies(res.data.companies);
    } catch (err) { console.error('Error fetching companies:', err); }
    finally { setLoading(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/companies/dashboard/stats`);
      if (res.data.success) setStats(res.data.stats);
    } catch (err) { console.error('Error fetching stats:', err); }
  }, []);

  const fetchCompanyEmployees = useCallback(async (companyId) => {
    try {
      const res = await axios.get(`${API_URL}/api/companies/${companyId}/employees`);
      if (res.data.success) setCompanyEmployees(res.data.employees);
    } catch (err) { console.error('Error fetching employees:', err); }
  }, []);

  useEffect(() => { fetchCompanies(); fetchStats(); }, [fetchCompanies, fetchStats]);

  const handleSelectCompany = (company) => {
    setSelectedCompany(company);
    fetchCompanyEmployees(company.id);
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.post(`${API_URL}/api/companies`, createForm);
      if (res.data.success) {
        setShowCreateModal(false);
        setCreateForm({ name: '', code: '', address: '', phone: '', email: '' });
        fetchCompanies(); fetchStats();
        setStatusMsg({ type: 'success', text: `Company "${res.data.company.name}" created!` });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to create company.' });
    } finally { setSaving(false); }
  };

  const handleDeleteCompany = async (id, name) => {
    if (!window.confirm(`Are you sure you want to deactivate "${name}"? This will not delete data but will prevent logins.`)) return;
    try {
      const res = await axios.delete(`${API_URL}/api/companies/${id}`);
      if (res.data.success) {
        fetchCompanies(); fetchStats();
        if (selectedCompany?.id === id) setSelectedCompany(null);
        setStatusMsg({ type: 'success', text: `Company "${name}" deactivated.` });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to delete company.' });
    }
  };

  const handleInviteEmployee = async (e) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setSaving(true);
    try {
      const res = await axios.post(`${API_URL}/api/companies/${selectedCompany.id}/invite`, inviteForm);
      if (res.data.success) {
        setShowInviteModal(false);
        setInviteForm({ name: '', email: '', role: 'employee', position: 'Staff', department: 'General' });
        fetchCompanyEmployees(selectedCompany.id);
        fetchStats();
        setStatusMsg({ type: 'success', text: `Employee "${inviteForm.name}" invited to ${selectedCompany.name}!` });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to invite employee.' });
    } finally { setSaving(false); }
  };

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Detail View
  if (selectedCompany) {
    return (
      <div className="dashboard-view animate-fadeInUp">
        <div style={{ padding: '0 20px', marginBottom: '20px' }}>
          <button className="btn-cancel" onClick={() => setSelectedCompany(null)} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>
            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>arrow_back</span> Back to Companies
          </button>

          <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>{selectedCompany.name}</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                  <span className="material-icons-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>tag</span> Code: <strong>{selectedCompany.code}</strong>
                  &nbsp;&nbsp;|&nbsp;&nbsp;
                  <span className={`type-badge ${selectedCompany.status === 'active' ? 'clock-in' : 'clock-out'}`}>{selectedCompany.status}</span>
                </p>
                {selectedCompany.address && <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '12px' }}><span className="material-icons-outlined" style={{ fontSize: '13px', verticalAlign: 'middle' }}>location_on</span> {selectedCompany.address}</p>}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-save" onClick={() => setShowInviteModal(true)} style={{ fontSize: '13px', padding: '8px 16px' }}>
                  <span className="material-icons-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>person_add</span> Invite
                </button>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-icons-outlined" style={{ fontSize: '18px' }}>groups</span> Employees ({companyEmployees.length})
            </h3>
            {companyEmployees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                <span className="material-icons-outlined" style={{ fontSize: '48px', opacity: 0.3 }}>person_off</span>
                <p>No employees yet. Invite someone!</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="history-table" style={{ width: '100%' }}>
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Position</th><th>Department</th></tr></thead>
                  <tbody>
                    {companyEmployees.map(emp => (
                      <tr key={emp.id}>
                        <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {emp.profilePicture ? <img src={emp.profilePicture} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%' }} referrerPolicy="no-referrer" /> : <div className="feed-card-item-avatar-placeholder blue" style={{ width: '28px', height: '28px', fontSize: '11px' }}>{getInitials(emp.name)}</div>}
                          {emp.name}
                        </td>
                        <td style={{ fontSize: '12px', color: '#64748b' }}>{emp.email}</td>
                        <td>
                          <select 
                            value={emp.role} 
                            onChange={async (e) => {
                              const newRole = e.target.value;
                              if (!window.confirm(`Ubah role ${emp.name} menjadi ${newRole}?`)) return;
                              try {
                                const res = await axios.put(`${API_URL}/api/companies/users/${emp.id}/role`, { role: newRole });
                                if (res.data.success) {
                                  fetchCompanyEmployees(selectedCompany.id);
                                  setStatusMsg({ type: 'success', text: 'Role updated!' });
                                }
                              } catch (err) { alert('Gagal mengubah role.'); }
                            }}
                            style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                          >
                            <option value="employee">Employee</option>
                            <option value="hrd">HRD</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin Company</option>
                          </select>
                        </td>
                        <td>{emp.position}</td>
                        <td>{emp.department}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="modal-overlay">
            <div className="modal-content animate-fadeInUp">
              <div className="modal-header">
                <h3>Invite Employee to {selectedCompany.name}</h3>
                <button className="modal-close" onClick={() => setShowInviteModal(false)}><span className="material-icons-outlined">close</span></button>
              </div>
              <form onSubmit={handleInviteEmployee} className="edit-profile-form">
                <div className="form-group"><label>Full Name</label><input value={inviteForm.name} onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} required /></div>
                <div className="form-group"><label>Email (Personal)</label><input type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} required /></div>
                <div className="form-row">
                  <div className="form-group"><label>Role</label>
                    <select value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}>
                      <option value="employee">Employee</option>
                      <option value="hrd">HRD</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin Company</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Position</label><input value={inviteForm.position} onChange={e => setInviteForm({ ...inviteForm, position: e.target.value })} /></div>
                </div>
                <div className="form-group"><label>Department</label><input value={inviteForm.department} onChange={e => setInviteForm({ ...inviteForm, department: e.target.value })} /></div>
                <div className="modal-footer">
                  <button type="button" className="btn-cancel" onClick={() => setShowInviteModal(false)}>Cancel</button>
                  <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Inviting...' : 'Send Invite'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List View
  return (
    <div className="dashboard-view animate-fadeInUp">
      <div style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
            <span className="material-icons-outlined" style={{ verticalAlign: 'middle', marginRight: '8px' }}>business</span>Company Management
          </h2>
          <button className="btn-save" onClick={() => setShowCreateModal(true)} style={{ fontSize: '13px', padding: '10px 20px' }}>
            <span className="material-icons-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>add</span> New Company
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid animate-fadeInScale" style={{ marginBottom: '24px' }}>
          <div className="stat-card glass-panel">
            <div className="stat-label">Total Companies</div>
            <div className="vibrant-value blue">{stats.totalCompanies}</div>
          </div>
          <div className="stat-card glass-panel">
            <div className="stat-label">Active Companies</div>
            <div className="vibrant-value green">{stats.activeCompanies}</div>
          </div>
          <div className="stat-card glass-panel">
            <div className="stat-label">Total Employees</div>
            <div className="vibrant-value">{stats.totalEmployees}</div>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ position: 'relative' }}>
            <span className="material-icons-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '18px' }}>search</span>
            <input type="text" placeholder="Search company name or code..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', background: '#f8fafc', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
            <span className="material-icons-outlined spin" style={{ fontSize: '32px' }}>sync</span>
            <p>Loading companies...</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
            <span className="material-icons-outlined" style={{ fontSize: '48px', opacity: 0.3 }}>domain_disabled</span>
            <p>No companies found.</p>
          </div>
        ) : (
          <div className="glass-panel" style={{ overflowX: 'auto' }}>
            <table className="history-table" style={{ width: '100%' }}>
              <thead><tr><th>Company</th><th>Code</th><th>Employees</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredCompanies.map(company => (
                  <tr key={company.id} style={{ cursor: 'pointer' }} onClick={() => handleSelectCompany(company)}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                          {company.code?.substring(0, 2)?.toUpperCase()}
                        </div>
                        <div>
                          <div>{company.name}</div>
                          {company.email && <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>{company.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>{company.code}</span></td>
                    <td>{company.users?.length || 0}</td>
                    <td><span className={`type-badge ${company.status === 'active' ? 'clock-in' : 'clock-out'}`}>{company.status}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleDeleteCompany(company.id, company.name)} title="Deactivate" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '18px' }}>delete_outline</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fadeInUp">
            <div className="modal-header">
              <h3>Create New Company</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}><span className="material-icons-outlined">close</span></button>
            </div>
            <form onSubmit={handleCreateCompany} className="edit-profile-form">
              <div className="form-group"><label>Company Name</label><input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="e.g. PT Maju Jaya" required /></div>
              <div className="form-row">
                <div className="form-group"><label>Company Code</label><input value={createForm.code} onChange={e => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })} placeholder="e.g. MJY" maxLength={10} required /></div>
                <div className="form-group"><label>Phone</label><input value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="+62..." /></div>
              </div>
              <div className="form-group"><label>Email</label><input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} placeholder="info@company.com" /></div>
              <div className="form-group"><label>Address</label><textarea value={createForm.address} onChange={e => setCreateForm({ ...createForm, address: e.target.value })} rows={2} placeholder="Company address..." /></div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Creating...' : 'Create Company'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
