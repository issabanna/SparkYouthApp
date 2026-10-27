import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { fetch as expoFetch } from 'expo/fetch';
import api from './api-request.cjs';
const key = 'spark-auth-session-v1',
  legacyKey = 'spark-registration-session-v1';
const origin = Platform.OS === 'web' ? '' : 'https://sparkyouth.vercel.app';
let session, loading, refreshing;
const listeners = new Set();
export const apiRequest = api.createApiRequest(
  Platform.OS === 'web' ? (...args) => fetch(...args) : expoFetch, origin
);
async function load() {
  if (session !== undefined) return session;
  if (!loading) loading = (async () => {
    try {
      let value;
      if (Platform.OS === 'web') {
        localStorage.removeItem(legacyKey);
        value = localStorage.getItem(key);
      } else {
        await FileSystem.deleteAsync(FileSystem.documentDirectory + legacyKey, {
          idempotent: true
        });
        try {
          value = await FileSystem.readAsStringAsync(FileSystem.documentDirectory + key);
        } catch {}
      }
      const parsed = value ? JSON.parse(value) : null;
      session = parsed?.access_token && parsed?.refresh_token ? parsed : null;
    } catch {
      session = null;
    }
    return session;
  })();
  return loading;
}
async function store(value) {
  session = value;
  loading = null;
  if (Platform.OS === 'web') {
    if (value) localStorage.setItem(key, JSON.stringify(value));else localStorage.removeItem(key);
  } else if (value) await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + key, JSON.stringify(value));else await FileSystem.deleteAsync(FileSystem.documentDirectory + key, {
    idempotent: true
  });
  if (!value) for (const fn of listeners) fn(null);
  return value;
}
export const subscribeAuth = fn => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const post = (body, token) => apiRequest('/api/auth', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token ? {
      Authorization: 'Bearer ' + token
    } : {})
  },
  body: JSON.stringify(body)
});
async function refresh() {
  if (!refreshing) refreshing = (async () => {
    const saved = await load();
    if (!saved) throw Error('سجّل الدخول بحسابك.');
    try {
      const result = await post({
        action: 'refresh',
        refreshToken: saved.refresh_token
      });
      if (!result.session) throw Error('انتهت الجلسة.');
      return await store(result.session);
    } catch (e) {
      if (e.status === 401) await store(null);
      throw e;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}
export async function accessToken() {
  const saved = await load();
  if (!saved) throw Error('سجّل الدخول بحسابك.');
  const current = saved.expires_at && saved.expires_at <= Date.now() / 1000 + 30 ? await refresh() : saved;
  return current.access_token;
}
export async function authenticatedRequest(path, options = {}) {
  let token = await accessToken();
  try {
    return await apiRequest(path, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: 'Bearer ' + token
      }
    });
  } catch (e) {
    if (e.status !== 401) throw e;
    token = (await refresh()).access_token;
    try {
      return await apiRequest(path, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: 'Bearer ' + token
        }
      });
    } catch (error) {
      if (error.status === 401) await store(null);
      throw error;
    }
  }
}
export async function restoreAuth() {
  if (Platform.OS === 'web' && window.location.hash) {
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.get('access_token') && params.get('refresh_token')) {
      const candidate = {
        access_token: params.get('access_token'),
        refresh_token: params.get('refresh_token'),
        expires_at: Number(params.get('expires_at')) || Date.now() / 1000 + Number(params.get('expires_in') || 3600)
      };
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      const verified = await apiRequest('/api/auth', {
        headers: {
          Authorization: 'Bearer ' + candidate.access_token
        }
      });
      if (!verified.authenticated) throw Error('تعذّر تأكيد الحساب. سجّل الدخول مجددًا.');
      await store({
        ...candidate,
        user: verified.user
      });
    }
  }
  const saved = await load();
  if (!saved) return null;
  try {
    const result = await authenticatedRequest('/api/auth');
    if (!result.authenticated) {
      await store(null);
      return null;
    }
    return result.user;
  } catch (e) {
    if (e.status === 401) {
      await store(null);
      return null;
    }
    throw e;
  }
}
export async function signIn(email, password) {
  const result = await post({
    action: 'login',
    email,
    password
  });
  if (!result.session) throw Error('يرجى تأكيد البريد الإلكتروني ثم تسجيل الدخول.');
  await store(result.session);
  return result.session.user;
}
export async function signUp(email, password) {
  const result = await post({
    action: 'signup',
    email,
    password
  });
  if (result.session) await store(result.session);
  return {
    user: result.session?.user || null,
    confirmationRequired: result.confirmationRequired
  };
}
export async function signOut() {
  const saved = await load();
  try {
    if (saved) await post({
      action: 'logout'
    }, await accessToken());
  } finally {
    await store(null);
  }
}
export async function changePassword(oldPassword, password) {
  const token = await accessToken(),
    result = await post({
      action: 'password',
      oldPassword,
      password
    }, token);
  if (result.session) await store(result.session);
}
