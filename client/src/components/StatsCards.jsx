import React from 'react';
import { HardDrive, FileText, FileCode } from 'lucide-react';

const StatsCards = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem', marginBottom: '1rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card" style={{ padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="skeleton" style={{ width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="skeleton" style={{ width: '60%', height: '10px', marginBottom: '5px' }} />
              <div className="skeleton" style={{ width: '40%', height: '15px' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const cardData = [
    { title: 'Total Documents', value: stats.total_files || 0,            icon: HardDrive, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    { title: 'Storage Used',    value: `${stats.total_size_mb || 0} MB`, icon: FileCode,  color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
    { title: 'PDF Files',       value: stats.pdf_count || 0,              icon: FileText,  color: '#F87171', bg: 'rgba(239,68,68,0.12)'  },
    { title: 'DOCX Files',      value: stats.docx_count || 0,             icon: FileText,  color: '#38BDF8', bg: 'rgba(56,189,248,0.12)' },
  ];

  return (
    <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem', marginBottom: '1rem' }}>
      {cardData.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="glass-card"
            style={{ padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
          >
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={15} color={card.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {card.title}
              </div>
              <div className="stat-value" style={{ fontSize: '1.05rem', fontWeight: '700', lineHeight: 1.2, color: 'var(--text-main)' }}>
                {card.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;
