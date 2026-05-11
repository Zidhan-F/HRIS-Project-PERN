import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL, getInitials } from '../utils/helpers';

export default function GlobalSettings({ user }) {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [inviteData, setInviteData] = useState({ name: '', email: '', role: 'super_admin' });
  const [showInviteForm, setShowInviteForm] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, cRes] = await Promise.all([
        axios.get(`${API_URL}/api/companies/users/all`),
        axios.get(`${API_URL}/api/companies`)
      ]);
      if (uRes.data.success) setUsers(uRes.data.users);
      if (cRes.data.success) setCompanies(cRes.data.companies);
    } catch (err) { console.error('Error fetching global settings:', err); }
    finally { setLoading(false); }
  }, []);

  const handleInviteGlobal = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/companies/users/global`, inviteData);
      if (res.data.success) {
        alert(res.data.message);
        setInviteData({ name: '', email: '', role: 'super_admin' });
        setShowInviteForm(false);
        fetchData();
      }
    } catch (err) { alert(err.response?.data?.message || 'Failed to invite'); }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdateRole = async (userId, newRole) => {
    if (!window.confirm(`Change user role to ${newRole}?`)) return;
    try {
      const res = await axios.put(`${API_URL}/api/companies/users/${userId}/role`, { role: newRole });
      if (res.data.success) fetchData();
    } catch (err) { alert('Failed to update role'); }
  };

  const handleTransfer = async (userId, newCompanyId) => {
    if (!window.confirm(`Transfer user to this company?`)) return;
    try {
      const res = await axios.put(`${API_URL}/api/companies/transfer/${userId}`, { companyId: newCompanyId });
      if (res.data.success) fetchData();
    } catch (err) { alert('Failed to transfer user'); }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="settings-view animate-fadeInUp">
      <div className="view-header" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>System Management</h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>Manage all users and global system permissions.</p>
        </div>
        <button 
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="btn-primary" 
          style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span className="material-icons-outlined">person_add</span>
          Add Global User
        </button>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        {showInviteForm && (
          <div className="glass-panel animate-fadeInDown" style={{ padding: '20px', marginBottom: '20px', background: '#f8fafc' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '15px' }}>Register New Global User</h3>
            <form onSubmit={handleInviteGlobal} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>
              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '5px' }}>Full Name</label>
                <input type="text" placeholder="Full Name" required value={inviteData.name} onChange={e => setInviteData({...inviteData, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '5px' }}>Email Address</label>
                <input type="email" placeholder="email@gmail.com" required value={inviteData.email} onChange={e => setInviteData({...inviteData, email: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '5px' }}>Initial Role</label>
                <select value={inviteData.role} onChange={e => setInviteData({...inviteData, role: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', pointerEvents: 'none' }}>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-primary" style={{ padding: '10px 20px', borderRadius: '8px' }}>Register</button>
                <button type="button" onClick={() => setShowInviteForm(false)} style={{ padding: '10px', background: 'transparent', color: '#64748b', border: 'none' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <span className="material-icons-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '18px' }}>search</span>
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px' }}
              />
            </div>
            <select 
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              style={{ padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', minWidth: '150px' }}
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin Company</option>
              <option value="hrd">HRD</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
            </select>
            <button onClick={fetchData} className="nav-icon-btn" style={{ background: '#f1f5f9' }}>
              <span className="material-icons-outlined">refresh</span>
            </button>
          </div>

          <div className="table-responsive">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>User Info</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '40px' }}>Loading users...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '40px' }}>No users found.</td></tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {u.profilePicture ? <img src={u.profilePicture} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} /> : <div className="feed-card-item-avatar-placeholder blue" style={{ width: '32px', height: '32px' }}>{getInitials(u.name)}</div>}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>{u.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          {u.company?.name || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No Company</span>}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <select 
                            value={u.role} 
                            disabled={u.isRoot}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            style={{ 
                              padding: '4px 8px', borderRadius: '6px', fontSize: '12px', border: '1px solid #e2e8f0', 
                              background: u.isRoot ? '#f1f5f9' : (u.role === 'super_admin' ? '#fae8ff' : '#fff'),
                              cursor: u.isRoot ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <option value="employee">Employee</option>
                            <option value="hrd">HRD</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin Company</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                          {u.isRoot && <span style={{ fontSize: '10px', color: '#a21caf', fontWeight: 800, background: '#fae8ff', padding: '2px 6px', borderRadius: '4px' }}>ROOT</span>}
                        </div>
                      </td>
                      <td>
                        {!u.isRoot && (
                          <button 
                            className="nav-icon-btn" 
                            style={{ color: '#ef4444' }} 
                            onClick={async () => {
                              if (!window.confirm(`Hapus user "${u.name}"?`)) return;
                              try {
                                const res = await axios.delete(`${API_URL}/api/companies/users/${u.id}`);
                                if (res.data.success) fetchData();
                              } catch (err) { alert(err.response?.data?.message || 'Gagal menghapus'); }
                            }}
                          >
                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>delete</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
