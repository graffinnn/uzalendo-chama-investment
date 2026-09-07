import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './apiConfig';

export async function downloadReport(path, filename) {
  const token = await AsyncStorage.getItem('userToken');
  const url = `${API_BASE_URL}/api/reports/${path}`;
  const fileUri = FileSystem.documentDirectory + filename;

  const downloadResult = await FileSystem.downloadAsync(url, fileUri, {
    headers: {
      authorization: token ? `Bearer ${token}` : '',
      'ngrok-skip-browser-warning': 'true'
    }
  });

  if (downloadResult.status !== 200) {
    throw new Error(`Failed to download report (status ${downloadResult.status}).`);
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(downloadResult.uri, {
      mimeType: 'application/pdf',
      dialogTitle: filename,
      UTI: 'com.adobe.pdf'
    });
  }

  return downloadResult.uri;
}