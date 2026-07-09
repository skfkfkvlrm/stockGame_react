import React from 'react';

const PlaceholderPage = ({ title, desc }) => (
    <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', marginTop: '40px' }}>
        <h1 style={{ color: 'var(--accent-secondary)', marginBottom: '16px' }}>{title}</h1>
        <p style={{ color: 'var(--text-muted)' }}>{desc}</p>
        <div style={{ marginTop: '30px', opacity: 0.5 }}>
            <span style={{ fontSize: '4rem' }}>🛠️</span>
            <p>백엔드 연동과 함께 곧 오픈됩니다.</p>
        </div>
    </div>
);

export default PlaceholderPage;
