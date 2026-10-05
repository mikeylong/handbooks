import { VeloriIcon } from 'velori-store-handbook-sample';
const cell = { display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--velori-color-ink)', fontFamily: 'var(--velori-font-body)' };
export const AllIcons = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, max-content)', gap: '16px 32px' }}>
    {(['check', 'chevron', 'friendly', 'simple'] as const).map((n) => (
      <div key={n} style={cell}><VeloriIcon name={n} /><span>{n}</span></div>
    ))}
  </div>
);
export const FaceExpressions = () => (
  <div style={{ display: 'flex', gap: 24, color: 'var(--velori-color-ink)' }}>
    <VeloriIcon name="friendly" style={{ width: 48, height: 48 }} />
    <VeloriIcon name="simple" style={{ width: 48, height: 48 }} />
  </div>
);
