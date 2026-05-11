import React, { useState } from 'react';
import { getInitials } from '../utils/helpers';

export default function TopNavbar({ sidebarOpen, openSidebar, user, handleLogout, setActiveMenu }) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        {!sidebarOpen && (
          <button className="nav-icon-btn" onClick={openSidebar}>
            <span className="material-icons-outlined">menu</span>
          </button>
        )}
      </div>
      <div className="navbar-right" style={{ position: 'relative' }}>
        <div 
          onClick={() => setShowDropdown(!showDropdown)} 
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          {user.picture ? (
            <img className="nav-avatar" src={user.picture} alt="" referrerPolicy="no-referrer" />
          ) : (
            <div className="nav-avatar-placeholder">{getInitials(user.name)}</div>
          )}
        </div>

        {showDropdown && (
          <>
            <div 
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} 
              onClick={() => setShowDropdown(false)}
            />
            <div className="glass-panel animate-fadeInDown" style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '10px',
              width: '180px', padding: '8px', zIndex: 999, boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
            }}>
              <button 
                className="sidebar-menu-item" 
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: 'none', background: 'transparent' }}
                onClick={() => { setActiveMenu('profile'); setShowDropdown(false); }}
              >
                <span className="material-icons-outlined" style={{ fontSize: '18px' }}>person</span>
                My Profile
              </button>
              <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />
              <button 
                className="sidebar-menu-item" 
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px', color: '#ef4444', border: 'none', background: 'transparent' }}
                onClick={handleLogout}
              >
                <span className="material-icons-outlined" style={{ fontSize: '18px' }}>logout</span>
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
