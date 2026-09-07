import React, { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { downloadReport } from '../services/reportDownload';

export default function ReportButton({ reportPath, filename, label, style, textStyle }) {
  const [downloading, setDownloading] = useState(false);

  const handlePress = async () => {
    setDownloading(true);
    try {
      await downloadReport(reportPath, filename);
    } catch (err) {
      Alert.alert('Download failed', err.message || 'Could not download report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={handlePress} disabled={downloading}>
      {downloading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={[styles.text, textStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200
  },
  text: { color: '#fff', fontWeight: '600', fontSize: 12 }
});