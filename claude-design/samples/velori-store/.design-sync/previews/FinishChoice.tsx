import { FinishChoice } from 'velori-store-handbook-sample';
const noop = () => {};
export const Default = () => <div style={{ width: 420 }}><FinishChoice value="chalk" onChange={noop} /></div>;
export const AlternateSelected = () => <div style={{ width: 420 }}><FinishChoice value="graphite" onChange={noop} /></div>;
