import { FaceChoice } from 'velori-store-handbook-sample';
const noop = () => {};
export const Default = () => <div style={{ width: 420 }}><FaceChoice value="friendly" onChange={noop} /></div>;
export const AlternateSelected = () => <div style={{ width: 420 }}><FaceChoice value="simple" onChange={noop} /></div>;
