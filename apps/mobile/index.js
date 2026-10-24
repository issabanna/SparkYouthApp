import React from 'react';
import { registerRootComponent } from 'expo';
import App from './App';
import AppBoundary from './AppBoundary';

function Root() {
  return <AppBoundary><App /></AppBoundary>;
}
registerRootComponent(Root);
