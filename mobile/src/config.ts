// For Android emulator, localhost on the host machine is 10.0.2.2.
// For iOS simulator, it's localhost.
// For a physical device, use your machine's LAN IP (e.g., 192.168.1.42).
import { Platform } from 'react-native';

const DEV_HOST =
  Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_URL = `https://padosi-assignment-ti5i.onrender.com`;