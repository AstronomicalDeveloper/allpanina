import type { CSSProperties } from 'react';

export const actionButtonStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '66px',
  minHeight: '48px',
  gap: '2px',
  padding: '5px 8px',
  background: '#16405A',
  color: '#FFFFFF',
  border: '1px solid #426176',
  borderRadius: '5px',
  fontSize: '9px',
  fontWeight: 800,
  letterSpacing: '0.2px',
  cursor: 'pointer',
};

export const actionIconStyle: CSSProperties = {
  fontSize: '18px',
  lineHeight: 1,
};

export const toolPanelStyle: CSSProperties = {
  position: 'absolute',
  zIndex: 30,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 'min(430px, calc(100vw - 28px))',
  maxHeight: 'calc(100vh - 130px)',
  overflowY: 'auto',
  background: '#09263B',
  color: '#FFFFFF',
  border: '1px solid #426176',
  borderRadius: '7px',
  boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
  fontFamily: 'Arial, sans-serif',
};

export const toolPanelHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '9px 12px',
  background: '#071D2D',
  color: '#FF7A1A',
  fontSize: '14px',
  borderBottom: '1px solid #426176',
};

export const panelCloseStyle: CSSProperties = {
  width: '24px',
  height: '24px',
  border: 0,
  borderRadius: '3px',
  background: '#E66A16',
  color: '#FFFFFF',
  fontSize: '20px',
  lineHeight: '20px',
  cursor: 'pointer',
};

export const fieldLabelStyle: CSSProperties = {
  display: 'grid',
  gap: '5px',
  color: '#FFFFFF',
  fontSize: '11px',
  fontWeight: 700,
};

export const selectStyle: CSSProperties = {
  width: '100%',
  padding: '8px',
  border: '1px solid #64748B',
  borderRadius: '4px',
  background: '#F8FAFC',
  color: '#14213D',
  fontSize: '12px',
};

export const checkLabelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: '#E2E8F0',
  fontSize: '12px',
  cursor: 'pointer',
};

export const primaryButtonStyle: CSSProperties = {
  border: 0,
  borderRadius: '4px',
  padding: '8px 11px',
  background: '#E66A16',
  color: '#FFFFFF',
  fontSize: '11px',
  fontWeight: 800,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

export const secondaryButtonStyle: CSSProperties = {
  border: '1px solid #64748B',
  borderRadius: '4px',
  padding: '8px 11px',
  background: '#334155',
  color: '#FFFFFF',
  fontSize: '11px',
  cursor: 'pointer',
};

export const statusMessageStyle: CSSProperties = {
  margin: '10px 0 0',
  padding: '8px',
  borderRadius: '4px',
  background: 'rgba(22,134,91,0.22)',
  color: '#B7F7D4',
  fontSize: '11px',
  lineHeight: 1.4,
};

export const socialButtonStyle: CSSProperties = {
  width: '42px',
  height: '42px',
  borderRadius: '50%',
  border: '1px solid #CBD5E1',
  background: '#16405A',
  color: '#FFFFFF',
  fontSize: '21px',
  fontWeight: 800,
  cursor: 'pointer',
};
