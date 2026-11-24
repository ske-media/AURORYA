// Trousseau iOS, par morceaux (SPEC §15.4).
import * as SecureStore from 'expo-secure-store';
import { type KeyValueStore, createChunkedStorage } from './chunked-storage';

const keychain: KeyValueStore = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export const secureStorage = createChunkedStorage(keychain);
