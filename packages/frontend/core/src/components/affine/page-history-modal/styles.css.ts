import { globalStyle, style } from '@vanilla-extract/css';

export const root = style({
  display: 'flex',
  height: '100%',
  width: '100%',
});

export const editor = style({
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  height: '100%',
});

export const historyList = style({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  height: '100%',
  width: 320,
});

export const historyItem = style({
  display: 'flex',
  alignItems: 'center',
  padding: '0 16px',
  height: 48,
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      backgroundColor: '#f5f5f5',
    },
    '&[data-active=true]': {
      color: '#ff0000',
    },
  },
});

globalStyle(`${historyItem} button`, {
  color: 'inherit',
});

export const restoreButton = style({
  height: '100%',
  padding: '0 16px',
  backgroundColor: '#f5f5f5',
  selectors: {
    '&:hover': {
      backgroundColor: '#e0e0e0',
    },
  },
});
