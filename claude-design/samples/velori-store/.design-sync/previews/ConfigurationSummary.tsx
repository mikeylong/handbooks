import { ConfigurationSummary } from 'velori-store-handbook-sample';
export const Default = () => <div style={{ width: 400 }}><ConfigurationSummary configuration={{ shell: 'chalk', face: 'friendly', color: 'white', accessory: 'dock' }} /></div>;
export const Customized = () => <div style={{ width: 400 }}><ConfigurationSummary configuration={{ shell: 'graphite', face: 'simple', color: 'mint', accessory: 'bag' }} /></div>;
