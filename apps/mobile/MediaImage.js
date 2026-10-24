import React, {useEffect, useState} from 'react';
import {Image, Platform, View, Text} from 'react-native';
import {resolveMediaSource} from './media-source';
import starterImageMap from './starter-image-map.json';
const bundled = {
  '/media/camp.png': require('../admin/public/media/camp.png'),
  '/media/trail.png': require('../admin/public/media/trail.png'),
  '/media/team.png': require('../admin/public/media/team.png'),
  '/media/spark-logo.png': require('../admin/public/media/spark-logo.png'),
};
// These URLs are immutable content-hash imports of the bundled photos.
// An admin replacement gets a new ID and loads its new image normally.
for(const [url,asset] of Object.entries(starterImageMap)){
  bundled[url]=bundled[asset];
  bundled['https://sparkyouth.vercel.app'+url]=bundled[asset];
}
export default function MediaImage({path, style, accessibilityLabel, ...props}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [path]);
  const source = resolveMediaSource(path, Platform.OS, bundled);
  if (!source || failed) return <View accessibilityLabel="الصورة غير متاحة" style={[style,{alignItems:'center',justifyContent:'center',backgroundColor:'#ECE9E1'}]}><Text style={{color:'#625F56',fontSize:12,textAlign:'center'}}>الصورة غير متاحة</Text></View>;
  return <Image {...props} source={source} style={style} accessibilityLabel={accessibilityLabel} onError={() => setFailed(true)} />;
}
