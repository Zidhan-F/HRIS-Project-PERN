import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { getInitials } from '../utils/helpers';

export default function LoginPage({ loading, statusMsg, handleLoginSuccess, handleLoginError }) {
  return (
    <div className="login-page">
      <div className="login-brand-bar">
        <img src="/logo.png" alt="" style={{ width: '32px', height: '32px', borderRadius: '8px' }} 
             onError={(e) => e.target.style.display = 'none'} />
        <div className="login-brand-text"><span className="login-brand-name">Day</span><span className="login-brand-sub" style={{ color: '#f97316' }}>HR</span></div>
      </div>
      <div className="login-card-area">
        <div className="login-card">
          <div className="login-card-logo">
            <img src="/logo.png" alt="DayHR Logo" style={{ width: '56px', height: '56px', borderRadius: '14px', marginBottom: '12px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }} 
                 onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            <div className="login-card-logo-icon" style={{ display: 'none', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', borderRadius: '12px', padding: '8px', color: 'white' }}>
              <span className="material-icons-outlined" style={{ fontSize: '28px' }}>wb_sunny</span>
            </div>
            <div className="login-card-brand"><span className="login-card-brand-name">Day</span><span className="login-card-brand-sub" style={{ color: '#f97316' }}>HR</span></div>
          </div>
          <div className="login-welcome"><h2>Welcome back!</h2><p>Please sign-in with Google Account</p></div>
          <div className="login-auth-area">
            {loading ? <div className="loading-spinner"></div> :
              <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginError} shape="pill" size="large" width="320" theme="outline" />}
          </div>
          {statusMsg && <div className={`status-message status-${statusMsg.type}`}>{statusMsg.text}</div>}
        </div>
      </div>
    </div>
  );
}
