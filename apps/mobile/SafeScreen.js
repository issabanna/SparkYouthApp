import React from 'react';
import { Platform, SafeAreaView, StatusBar } from 'react-native';

// Core SafeAreaView handles iOS; Android draws edge-to-edge and needs its
// reported status-bar inset, including display cutouts, applied explicitly.
export default function SafeScreen({ style, children, ...props }) {
  return <SafeAreaView {...props} style={[style, Platform.OS === 'android' && {
    paddingTop: StatusBar.currentHeight || 0
  }]}>{children}</SafeAreaView>;
}
