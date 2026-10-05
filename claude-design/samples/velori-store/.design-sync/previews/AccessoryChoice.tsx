import { AccessoryChoice } from 'velori-store-handbook-sample';
const noop = () => {};
export const Default = () => <div style={{ width: 420 }}><AccessoryChoice value="dock" onChange={noop} /></div>;
export const AlternateSelected = () => <div style={{ width: 420 }}><AccessoryChoice value="bag" onChange={noop} /></div>;
