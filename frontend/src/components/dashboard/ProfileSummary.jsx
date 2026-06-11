import React from 'react'
import { useSelector } from 'react-redux'
import { selectUser } from '../../store/userslice'
import { selectActiveResume } from '../../store/resumeslice'

export default function ProfileSummary() {
  const user         = useSelector(selectUser)
  const activeResume = useSelector(selectActiveResume)

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const skillCount    = user?.skills?.length || 0
  const goalCount     = user?.targetRoles?.length || 0
  const hasResume     = !!activeResume

  const stats = [
    { label: 'Profile Score',     value: user ? '78%' : '—',  color: 'var(--accent)',  icon: '⚡' },
    { label: 'Skills Added',      value: skillCount,           color: 'var(--blue)',    icon: '🎯' },
    { label: 'Career Goals',      value: goalCount,            color: 'var(--purple)',  icon: '💼' },
    { label: 'Resume Uploaded',   value: hasResume ? '✓' : '✗', color: hasResume ? 'var(--green)' : 'var(--orange)', icon: '📄' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* User card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--blue), var(--purple))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: '#fff'
        }}>{initials}</div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            {user?.name || 'Welcome!'}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {user?.title || 'No title set yet'}
          </div>
          {user?.targetRoles?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {user.targetRoles.slice(0, 2).map(r => (
                <span key={r} className="badge" style={{ background: 'var(--blue-dim)', color: 'var(--blue)', fontSize: 10 }}>
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid-2">
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: '16px', textAlign: 'center' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = s.color + '44'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: s.color }}>{s.value}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}