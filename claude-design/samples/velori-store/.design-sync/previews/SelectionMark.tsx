import { SelectionMark } from 'velori-store-handbook-sample';
// SelectionMark is absolutely positioned (top: 8px, right: 8px) - it always sits
// inside a position: relative container, normally a chosen choice tile.
const tile = { position: 'relative' as const, width: 120, height: 72, borderRadius: 'var(--velori-control-radius)', border: '2px solid var(--velori-color-selectedBorder)', background: 'var(--velori-color-selectedFill)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontFamily: 'var(--velori-font-body)', color: 'var(--velori-color-ink)' };
export const OnChosenTile = () => <div style={tile}>Graphite<SelectionMark /></div>;
