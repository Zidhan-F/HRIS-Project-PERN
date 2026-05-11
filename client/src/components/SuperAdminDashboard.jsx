import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL, getInitials, formatCurrency } from '../utils/helpers';

export default function SuperAdminDashboard({ user, currentTime, handleMenuClick }) {
  const [stats, setStats] = useState({ totalCompanies: 0, activeCompanies: 0, totalUsers: 0, totalSuperAdmins: 0, companyStats: [] });
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/api/companies/dashboard/stats`),
        axios.get(`${API_URL}/api/companies/users/all`),
      ]);
      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (usersRes.data.success) {
        const sorted = usersRes.data.users.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
        setRecentUsers(sorted.slice(0, 8));
      }
    } catch (err) { console.error('Dashboard fetch error:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const inactiveCompanies = stats.totalCompanies - stats.activeCompanies;

  if (loading) {
    return (
      <div className="dashboard-view animate-fadeInUp" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <span className="material-icons-outlined spin" style={{ fontSize: '40px' }}>sync</span>
          <p style={{ marginTop: '12px', fontSize: '14px' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-view animate-fadeInUp">
      {/* Welcome Header */}
      <div style={{ padding: '0 20px', marginBottom: '24px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)',
          borderRadius: '20px', padding: '32px', color: '#fff', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-20px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', bottom: '-60px', right: '80px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: '13px', opacity: 0.7, marginBottom: '4px' }}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: 800 }}>
              Welcome back, {user.name?.split(' ')[0]}!
            </h1>
            <p style={{ fontSize: '14px', opacity: 0.7, margin: 0 }}>
              Here's what's happening across your platform today.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                <span className="material-icons-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>shield</span>
                Super Admin
              </span>
              <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                <span className="material-icons-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>schedule</span>
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ padding: '0 20px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
          {[
            { label: 'Total Companies', value: stats.totalCompanies, icon: 'business', gradient: 'linear-gradient(135deg, #6366f1, #818cf8)', iconBg: 'rgba(99,102,241,0.2)' },
            { label: 'Active Companies', value: stats.activeCompanies, icon: 'verified', gradient: 'linear-gradient(135deg, #10b981, #34d399)', iconBg: 'rgba(16,185,129,0.2)' },
            { label: 'Inactive', value: inactiveCompanies, icon: 'pause_circle', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)', iconBg: 'rgba(245,158,11,0.2)' },
            { label: 'Total Users', value: stats.totalUsers, icon: 'groups', gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)', iconBg: 'rgba(59,130,246,0.2)' },
          ].map((kpi, idx) => (
            <div key={idx} className="glass-panel animate-fadeInScale" style={{ padding: '20px', textAlign: 'center', animationDelay: `${idx * 0.05}s`, position: 'relative', overflow: 'hidden' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px', background: kpi.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
                boxShadow: `0 4px 12px ${kpi.iconBg}`,
              }}>
                <span className="material-icons-outlined" style={{ color: '#fff', fontSize: '22px' }}>{kpi.icon}</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>

        {/* Company Breakdown */}
        <div className="glass-panel animate-fadeInScale" style={{ padding: '20px', animationDelay: '0.2s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-icons-outlined" style={{ fontSize: '18px', color: '#6366f1' }}>analytics</span>
              Company Breakdown
            </h3>
            <button onClick={() => handleMenuClick('companies')} style={{ background: 'none', border: 'none', fontSize: '12px', color: '#6366f1', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
              View All<span className="material-icons-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
            </button>
          </div>
          {stats.companyStats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
              <span className="material-icons-outlined" style={{ fontSize: '36px', opacity: 0.3 }}>domain_disabled</span>
              <p style={{ fontSize: '13px' }}>No active companies yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats.companyStats.slice(0, 6).map((company, idx) => {
                const maxEmployees = Math.max(...stats.companyStats.map(c => c.employeeCount), 1);
                const barWidth = (company.employeeCount / maxEmployees) * 100;
                return (
                  <div key={company.id} className="animate-fadeInRight" style={{ animationDelay: `${0.25 + idx * 0.05}s` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '8px',
                          background: `hsl(${(idx * 55) % 360}, 70%, 55%)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: '10px', fontWeight: 800, flexShrink: 0,
                        }}>{company.code?.substring(0, 2)}</div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>{company.name}</span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{company.employeeCount}</span>
                    </div>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${barWidth}%`, height: '100%',
                        background: `hsl(${(idx * 55) % 360}, 70%, 55%)`,
                        borderRadius: '3px', transition: 'width 0.8s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Employees */}
        <div className="glass-panel animate-fadeInScale" style={{ padding: '20px', animationDelay: '0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-icons-outlined" style={{ fontSize: '18px', color: '#10b981' }}>person_add</span>
              Recent Employees
            </h3>
          </div>
          {recentUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
              <span className="material-icons-outlined" style={{ fontSize: '36px', opacity: 0.3 }}>person_off</span>
              <p style={{ fontSize: '13px' }}>No employees registered.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentUsers.map((emp, idx) => (
                <div key={emp.id} className="animate-fadeInRight" style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px',
                  borderRadius: '10px', background: idx % 2 === 0 ? '#f8fafc' : 'transparent',
                  animationDelay: `${0.3 + idx * 0.04}s`,
                }}>
                  {emp.profilePicture ? (
                    <img src={emp.profilePicture} alt="" referrerPolicy="no-referrer" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: `hsl(${(idx * 45) % 360}, 60%, 90%)`,
                      color: `hsl(${(idx * 45) % 360}, 60%, 40%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700, flexShrink: 0,
                    }}>{getInitials(emp.name)}</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {emp.company?.name || 'Unassigned'} · {emp.role}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px',
                      background: emp.role === 'admin' ? '#dbeafe' : emp.role === 'super_admin' ? '#fae8ff' : '#f0fdf4',
                      color: emp.role === 'admin' ? '#1d4ed8' : emp.role === 'super_admin' ? '#a21caf' : '#166534',
                    }}>{emp.role}</span>
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!window.confirm(`Hapus user "${emp.name}" secara permanen?`)) return;
                        try {
                          const res = await axios.delete(`${API_URL}/api/companies/users/${emp.id}`);
                          if (res.data.success) {
                            fetchDashboardData();
                          }
                        } catch (err) { alert('Gagal menghapus user.'); }
                      }}
                      style={{ color: '#ef4444', padding: '4px', borderRadius: '6px', background: 'transparent' }}
                      onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span className="material-icons-outlined" style={{ fontSize: '16px' }}>delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ padding: '0 20px', marginBottom: '24px' }}>
        <div className="glass-panel animate-fadeInScale" style={{ padding: '20px', animationDelay: '0.35s' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-icons-outlined" style={{ fontSize: '18px', color: '#f59e0b' }}>bolt</span>
            Quick Actions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            {[
              { label: 'Add Company', icon: 'add_business', color: '#6366f1', bg: '#eef2ff', menu: 'companies' },
              { label: 'All Employees', icon: 'groups', color: '#3b82f6', bg: '#eff6ff', menu: 'employee' },
              { label: 'Payroll Overview', icon: 'account_balance_wallet', color: '#10b981', bg: '#ecfdf5', menu: 'payroll' },
              { label: 'System Settings', icon: 'tune', color: '#f59e0b', bg: '#fffbeb', menu: 'settings' },
            ].map((action, idx) => (
              <button key={idx} onClick={() => handleMenuClick(action.menu)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                padding: '16px 12px', borderRadius: '12px', border: '1px solid #e2e8f0',
                background: action.bg, cursor: 'pointer', transition: 'all 0.2s',
              }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <span className="material-icons-outlined" style={{ fontSize: '24px', color: action.color }}>{action.icon}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
