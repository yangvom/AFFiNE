import { style } from '@vanilla-extract/css';

export const labelStyle = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  cursor: 'pointer',
  width: '46px',
  height: '26px',
});
export const inputStyle = style({
  opacity: 0,
  position: 'absolute',
});
export const switchStyle = style({
  position: 'relative',
  width: '44px',
  height: '24px',
  background: 'var(--affine-toggle-disable-background-color)',
  borderRadius: '37px',
  transition: '200ms all',
  transform: 'translate(1px, 1px)',
  boxShadow: '0 0 0 1px var(--affine-black-10)',
  selectors: {
    '&:before': {
      transition: 'all .2s cubic-bezier(0.27, 0.2, 0.25, 1.51)',
      content: '""',
      position: 'absolute',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      top: '50%',
      background: 'var(--affine-white)',
      transform: 'translate(2px, -50%)',
      boxShadow: '0 0 0 1px var(--affine-black-10) inset',
    },
  },
});
export const switchCheckedStyle = style({
  background: 'var(--affine-primary-color)',
  selectors: {
    '&:before': {
      background: 'var(--affine-toggle-circle-background-color)',
      transform: 'translate(21px,-50%)',
    },
  },
});
