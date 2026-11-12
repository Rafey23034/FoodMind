import React from 'react';
import ScreenFrame from '../ScreenFrame';

export default function RiderLayout({ hasTabs = false, ...props }) {
  return <ScreenFrame {...props} hasTabs={hasTabs} />;
}
