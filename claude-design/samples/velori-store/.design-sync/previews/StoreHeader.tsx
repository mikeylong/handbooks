import { StoreHeader } from 'velori-store-handbook-sample';
export const ConfigureStep = () => <div style={{ width: 760 }}><StoreHeader /></div>;
export const ReviewStep = () => <div style={{ width: 760 }}><StoreHeader review /></div>;
export const WithBackLink = () => <div style={{ width: 760 }}><StoreHeader onBack={() => {}} /></div>;
