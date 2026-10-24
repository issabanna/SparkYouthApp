import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export default class AppBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={styles.screen}>
        <Text style={styles.brand}>SPARK</Text>
        <Text style={styles.title}>تعذّر عرض الصفحة</Text>
        <Text style={styles.copy}>حاول فتح التطبيق مرة أخرى. بياناتك المحفوظة ستبقى كما هي.</Text>
        <Pressable accessibilityRole="button" style={styles.button} onPress={() => {
          if (Platform.OS === 'web') window.location.reload();
          else this.setState({ failed: false });
        }}>
          <Text style={styles.label}>إعادة المحاولة</Text>
        </Pressable>
      </View>
    );
  }
}
const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F6F4EF' },
  brand: { fontSize: 28, fontWeight: '800', marginBottom: 28 },
  title: { fontSize: 23, fontWeight: '700', textAlign: 'center', color: '#252820' },
  copy: { fontSize: 16, lineHeight: 26, textAlign: 'center', marginVertical: 18, color: '#55594F' },
  button: { paddingHorizontal: 30, paddingVertical: 15, borderRadius: 20, backgroundColor: '#FFD900' },
  label: { fontSize: 17, fontWeight: '700', color: '#252820' },
});
