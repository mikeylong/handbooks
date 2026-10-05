import { ChoiceGroup } from 'velori-store-handbook-sample';
const noop = () => {};
export const Shell = () => <div style={{ width: 420 }}><ChoiceGroup group="shell" value="pebble" onChange={noop} /></div>;
export const Face = () => <div style={{ width: 420 }}><ChoiceGroup group="face" value="friendly" onChange={noop} /></div>;
export const Accessory = () => <div style={{ width: 420 }}><ChoiceGroup group="accessory" value="none" onChange={noop} /></div>;
