import { ProductPreview } from 'velori-store-handbook-sample';
export const Default = () => <div style={{ width: 400 }}><ProductPreview configuration={{ shell: 'chalk', face: 'friendly', color: 'white', accessory: 'dock' }} /></div>;
export const GraphiteCarryBagMint = () => <div style={{ width: 400 }}><ProductPreview configuration={{ shell: 'graphite', face: 'simple', color: 'mint', accessory: 'bag' }} /></div>;
export const ImageUnavailable = () => <div style={{ width: 400 }}><ProductPreview unavailable configuration={{ shell: 'chalk', face: 'friendly', color: 'white', accessory: 'dock' }} /></div>;
