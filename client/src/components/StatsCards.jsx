import React from 'react';
import { HardDrive, FileText, FileCode } from 'lucide-react';

const StatsCards = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card" style={{ padding: '1.1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="skeleton" style={{ width: '65%', height: '11px', marginBottom: '7px' }} />
              <div className="skeleton" style={{ width: '45%', height: '19px' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const cardData = [
    { title: 'Total Documents', value: stats.total_files || 0,           icon: HardDrive, color: '#10B981', bg: 'rgba(16,185,129,0.14)', border: 'rgba(16,185,129,0.35)' },
    { title: 'Storage Used',    value: `${stats.total_size_mb || 0} MB`, icon: FileCode,  color: '#34D399', bg: 'rgba(52,211,153,0.14)', border: 'rgba(52,211,153,0.35)' },
    { title: 'PDF Files',       value: stats.pdf_count || 0,             icon: FileText,  color: '#F87171', bg: 'rgba(239,68,68,0.14)',  border: 'rgba(239,68,68,0.35)'  },
    { title: 'DOCX Files',      value: stats.docx_count || 0,            icon: FileText,  color: '#38BDF8', bg: 'rgba(56,189,248,0.14)', border: 'rgba(56,189,248,0.35)' },
  ];

  return (
    <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
      {cardData.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="glass-card animate-slide-up"
            style={{ padding: '1.1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.85rem', animationDelay: `${idx * 0.06}s`, borderLeft: `3px solid ${card.color}` }}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '11px', background: card.bg, border: `1px solid ${card.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={21} color={card.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {card.title}
              </div>
              <div className="stat-value" style={{ fontSize: '1.35rem', fontWeight: '800', marginTop: '0.15rem', color: 'var(--text-main)' }}>
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
