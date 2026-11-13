import React from 'react';
import ScreenFrame from '../ScreenFrame';

// Every customer screen lives inside the bottom tab navigator.
export default function ScreenLayout(props) {
  return <ScreenFrame {...props} hasTabs />;
}
