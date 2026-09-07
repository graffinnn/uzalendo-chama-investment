import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LandingScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>UC</Text>
          </View>
          <Text style={styles.title}>Uzalendo Chama</Text>
          <Text style={styles.subtitle}>Investment Group</Text>
          <Text style={styles.tagline}>
            Manage contributions, loans, savings and the merry-go-round all in one place.
          </Text>
        </View>

        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryButtonText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.secondaryButtonText}>Create an Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1B5E20' },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 40
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  logoText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#C8E6C9',
    marginTop: 4,
    marginBottom: 20
  },
  tagline: {
    fontSize: 14,
    color: '#E8F5E9',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10
  },
  buttonSection: { gap: 12 },
  primaryButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center'
  },
  primaryButtonText: { color: '#1B5E20', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center'
  },
  secondaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});