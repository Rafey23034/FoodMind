import React from 'react';
import ScreenFrame from '../ScreenFrame';

export default function PartnerLayout({ hasTabs = false, ...props }) {
  return <ScreenFrame {...props} hasTabs={hasTabs} />;
}
