import React from 'react';
import { MENU_ITEMS } from '../utils/helpers';

export default function Sidebar({ sidebarOpen, sidebarClosing, closeSidebar, activeMenu, activeSubMenu, expandedMenu, user, handleMenuClick, handleSubMenuClick }) {
  const filteredMenus = MENU_ITEMS.filter(item => {
    if (item.roles && !item.roles.includes(user?.role)) return false;
    return true;
  });

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${sidebarClosing ? 'sidebar-closing' : ''}`}>
      <div className="sidebar-header">
        <button className="sidebar-close-btn" onClick={closeSidebar}>
          <span className="material-icons-outlined">menu_open</span>
        </button>
        <div className="sidebar-logo">
          <img src="/logo.png" alt="" style={{ width: '32px', height: '32px', borderRadius: '8px' }} 
               onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
          <div className="sidebar-logo-icon" style={{ display: 'none', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', borderRadius: '8px', padding: '4px' }}>
            <span className="material-icons-outlined" style={{ color: 'white', fontSize: '20px' }}>wb_sunny</span>
          </div>
        </div>
        <div className="sidebar-company">
          <span className="sidebar-company-name">{user?.companyName || 'DayHR'}</span>
          {user?.role === 'super_admin' && <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>Super Admin</span>}
        </div>
      </div>
      <nav className="sidebar-nav">
        {filteredMenus.map((item) => (
          <React.Fragment key={item.id}>
            <button className={`sidebar-menu-item ${activeMenu === item.id && !activeSubMenu ? 'active' : ''} ${expandedMenu === item.id ? 'expanded' : ''}`} onClick={() => handleMenuClick(item.id)}>
              <span className="sidebar-menu-left"><span className="material-icons-outlined">{item.icon}</span>{item.label}</span>
              {item.hasSubmenu && <span className={`material-icons-outlined arrow-icon ${expandedMenu === item.id ? 'rotate' : ''}`}>expand_more</span>}
            </button>
            {item.hasSubmenu && expandedMenu === item.id && item.submenus && (
              <div className="sidebar-submenus">
                {item.submenus
                  .filter(sub => !(['att-report', 'att-daily'].includes(sub.id) && user?.role === 'employee'))
                  .map(sub => (
                    <button key={sub.id} className={`sidebar-submenu-item ${activeSubMenu === sub.id ? 'active' : ''}`} onClick={() => handleSubMenuClick(item.id, sub.id)}>{sub.label}</button>
                  ))}
              </div>
            )}
          </React.Fragment>
        ))}
      </nav>
    </aside>
  );
}
