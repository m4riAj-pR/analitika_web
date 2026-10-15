/**
 * theme.js — Design tokens de Analitika Web
 * Los valores aquí son referencias a las CSS custom properties de global.css
 */
export const tokens = {
  color: {
    primary:       'var(--color-primary)',
    primaryLight:  'var(--color-primary-light)',
    primaryDark:   'var(--color-primary-dark)',
    primaryBg:     'var(--color-primary-bg)',
    surface:       'var(--color-surface)',
    surfaceMid:    'var(--color-surface-mid)',
    surfaceBorder: 'var(--color-surface-border)',
    text:          'var(--color-text)',
    textMuted:     'var(--color-text-muted)',
    success:       'var(--color-success)',
    danger:        'var(--color-danger)',
    warn:          'var(--color-warn)',
  },
  sidebar: { width: '64px' },
  topbar:  { height: '56px' },
};

export default tokens;
