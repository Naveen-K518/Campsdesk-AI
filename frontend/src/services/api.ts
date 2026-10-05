import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Query, Guideline, Student } from '../types';

const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      return `http://${window.location.hostname}:5000`;
    }
  }
  return envUrl || 'http://localhost:5000';
};

const BASE_URL = getBaseUrl();
const TOKEN_KEY = '@campusdesk_jwt_token_v1';

let cachedToken: string | null = null;

export async function getAuthToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  try {
    cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
    return cachedToken;
  } catch (err) {
    console.warn('Failed to retrieve token from storage:', err);
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  cachedToken = token;
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.warn('Failed to save token to storage:', err);
  }
}

export async function clearAuthToken(): Promise<void> {
  cachedToken = null;
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.warn('Failed to clear token from storage:', err);
  }
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorMsg =
        (typeof data === 'object' && data?.error) ||
        (typeof data === 'string' ? data : `Request failed with status ${response.status}`);
      throw new Error(errorMsg);
    }

    return data as T;
  } catch (error: any) {
    console.error(`[API] Error on ${options.method || 'GET'} ${endpoint}:`, error.message);
    throw error;
  }
}

// 1. Authentication APIs
export async function login(email: string, password: string) {
  const data = await request<{
    token: string;
    user: any;
    student: Student | null;
  }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (data.token) {
    await setAuthToken(data.token);
  }
  return data;
}

export async function register(userData: {
  email: string;
  password: string;
  name: string;
  rollNo?: string;
  program?: string;
  department?: string;
  role?: 'student' | 'faculty';
}) {
  const data = await request<{
    token: string;
    user: any;
    student: Student | null;
  }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });

  if (data.token) {
    await setAuthToken(data.token);
  }
  return data;
}

export async function getMe() {
  return request<{ user: any; student: Student | null }>('/api/auth/me');
}

// 2. Guidelines APIs
export async function getGuidelines(): Promise<Guideline[]> {
  return request<Guideline[]>('/api/guidelines');
}

// 3. AI Orchestration APIs
export async function submitAIQuery(
  prompt: string,
  guidelinesContext?: string
): Promise<{ response: string }> {
  return request<{ response: string }>('/api/ai/query', {
    method: 'POST',
    body: JSON.stringify({ prompt, guidelinesContext }),
  });
}

// 4. Query Management APIs
export async function getQueries(): Promise<Query[]> {
  return request<Query[]>('/api/queries');
}

export async function createQuery(queryData: Partial<Query>): Promise<Query> {
  return request<Query>('/api/queries', {
    method: 'POST',
    body: JSON.stringify(queryData),
  });
}

export async function getQueryById(id: string): Promise<Query> {
  return request<Query>(`/api/queries/${id}`);
}

export async function updateQueryStatus(
  id: string,
  status: string,
  facultyRemark?: string
): Promise<Query> {
  return request<Query>(`/api/queries/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, facultyRemark }),
  });
}

export async function addAuditEntry(
  queryId: string,
  entry: {
    text?: string;
    actionTaken?: string;
    statusBanner?: string;
    tokenRef?: string;
    attachedDoc?: {
      name: string;
      size: string;
      caption?: string;
      url?: string;
    };
  }
): Promise<Query> {
  return request<Query>(`/api/queries/${queryId}/audit`, {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

// 5. Document Upload API
export async function uploadDocument(file: {
  uri: string;
  name: string;
  type?: string;
}): Promise<{
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: string;
  url: string;
}> {
  const token = await getAuthToken();
  const formData = new FormData();

  // Create file blob/object compatible with fetch
  const fileToUpload: any = {
    uri: file.uri,
    name: file.name,
    type: file.type || 'application/pdf',
  };
  formData.append('file', fileToUpload);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Upload failed (${response.status}): ${errText}`);
  }

  return response.json();
}
