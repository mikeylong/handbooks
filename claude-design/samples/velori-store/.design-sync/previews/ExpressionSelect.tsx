import { ExpressionSelect } from 'velori-store-handbook-sample';
const noop = () => {};
export const White = () => <div style={{ width: 360 }}><ExpressionSelect value="white" onChange={noop} /></div>;
export const Mint = () => <div style={{ width: 360 }}><ExpressionSelect value="mint" onChange={noop} /></div>;
export const Amber = () => <div style={{ width: 360 }}><ExpressionSelect value="amber" onChange={noop} /></div>;
