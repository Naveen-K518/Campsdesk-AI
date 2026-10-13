import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Student, Query, Guideline, NotificationItem, AuditEntry, QueryStatus } from '../types';
import { mockStudent, mockQueries, mockGuidelines, mockNotifications } from '../data/mockData';
import * as api from '../services/api';
import {
  getSocket,
  reconnectSocket,
  disconnectSocket,
} from '../services/socket';

export interface AuthUserInfo {
  id: string;
  email: string;
  role: 'student' | 'mentor' | 'faculty' | 'admin';
  name: string;
  studentId?: string | null;
}


interface QueryContextType {
  student: Student;
  currentUser: AuthUserInfo | null;
  queries: Query[];
  guidelines: Guideline[];
  notifications: NotificationItem[];
  isLoggedIn: boolean;
  unreadNotificationCount: number;
  prefilledPrompt: string;
  setPrefilledPrompt: (prompt: string) => void;
  addQuery: (newQuery: Omit<Query, 'id' | 'code' | 'createdAt' | 'updatedAt'>) => Query;
  updateQueryStatus: (queryId: string, status: QueryStatus, facultyRemark?: string) => Promise<void> | void;
  addAuditEntry: (queryId: string, entry: Omit<AuditEntry, 'id' | 'timestamp'>) => Promise<void> | void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: AuthUserInfo | null; error?: string }>;
  loginWithGoogle: (idToken: string) => Promise<{ success: boolean; user?: AuthUserInfo | null; error?: string }>;
  registerUser: (data: {
    email: string;
    password: string;
    name: string;
    rollNo?: string;
    program?: string;
    department?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateStudent: (partial: Partial<Student>) => void;
  refreshQueries: () => Promise<void>;
  refreshGuidelines: () => Promise<void>;
}

const STORAGE_KEYS = {
  QUERIES: '@campusdesk_queries_v1',
  AUTH: '@campusdesk_auth_v1',
  STUDENT: '@campusdesk_student_v1',
  USER: '@campusdesk_user_v1',
};

const QueryContext = createContext<QueryContextType | undefined>(undefined);

export const QueryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [student, setStudent] = useState<Student>(mockStudent);
  const [currentUser, setCurrentUser] = useState<AuthUserInfo | null>(null);
  const [queries, setQueries] = useState<Query[]>(mockQueries);
  const [guidelines, setGuidelines] = useState<Guideline[]>(mockGuidelines);
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [prefilledPrompt, setPrefilledPrompt] = useState<string>('');

  // Load state from backend on startup or cached storage
  useEffect(() => {
    const initializeAppState = async () => {
      try {
        // 1. Check if token exists
        const token = await api.getAuthToken();
        if (token) {
          try {
            const meData = await api.getMe();
            if (meData?.user) {
              setCurrentUser(meData.user);
              setIsLoggedIn(true);
              if (meData.student) {
                setStudent(meData.student);
              }
            }
          } catch (tokenErr) {
            console.warn('[QueryContext] Token validation failed:', tokenErr);
          }
        }

        // 2. Fetch guidelines from backend
        try {
          const liveGuidelines = await api.getGuidelines();
          if (Array.isArray(liveGuidelines) && liveGuidelines.length > 0) {
            setGuidelines(liveGuidelines);
          }
        } catch (gErr) {
          console.warn('[QueryContext] Using default guidelines fallback:', gErr);
        }

        // 3. Fetch queries from backend
        try {
          const liveQueries = await api.getQueries();
          if (Array.isArray(liveQueries) && liveQueries.length > 0) {
            setQueries(liveQueries);
            await AsyncStorage.setItem(STORAGE_KEYS.QUERIES, JSON.stringify(liveQueries));
          } else {
            // Check AsyncStorage fallback
            const cachedQueries = await AsyncStorage.getItem(STORAGE_KEYS.QUERIES);
            if (cachedQueries) {
              const parsed = JSON.parse(cachedQueries);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setQueries(parsed);
              }
            }
          }
        } catch (qErr) {
          console.warn('[QueryContext] Using cached/mock queries:', qErr);
        }
      } catch (err) {
        console.warn('[QueryContext] Initialization error:', err);
      }
    };

    initializeAppState();
  }, []);

  // Real-time WebSocket synchronization for live docket updates
  useEffect(() => {
    if (!isLoggedIn) {
      disconnectSocket();
      return;
    }

    let isMounted = true;
    let s: any = null;

    const handleQueryCreated = (newDocket: Query) => {
      setQueries((prev) => {
        if (prev.some((q) => q.id === newDocket.id || q.code === newDocket.code)) {
          return prev;
        }
        return [newDocket, ...prev];
      });

      const notice: NotificationItem = {
        id: `n_${Date.now()}`,
        title: 'New Docket Initiated',
        description: `Case ${newDocket.code} (${newDocket.subject}) entered the queue.`,
        timestamp: 'Just now',
        read: false,
        type: 'update',
        linkQueryId: newDocket.id,
      };
      setNotifications((prev) => [notice, ...prev]);
    };

    const handleQueryUpdated = (updatedDocket: Query) => {
      setQueries((prev) =>
        prev.map((q) => (q.id === updatedDocket.id ? updatedDocket : q))
      );

      let noticeTitle = `Docket ${updatedDocket.code} Updated`;
      let noticeDesc = `Status: ${updatedDocket.status.toUpperCase()}`;

      if (updatedDocket.status === 'resolved') {
        noticeTitle = `✓ Docket ${updatedDocket.code} Approved`;
        noticeDesc = `Faculty granted approval / condonation.`;
      } else if (updatedDocket.status === 'action_required') {
        noticeTitle = `⚠️ Action Required: ${updatedDocket.code}`;
        noticeDesc = `Faculty requested further physical documentation.`;
      }

      const notice: NotificationItem = {
        id: `n_${Date.now()}`,
        title: noticeTitle,
        description: noticeDesc,
        timestamp: 'Just now',
        read: false,
        type: 'alert',
        linkQueryId: updatedDocket.id,
      };
      setNotifications((prev) => [notice, ...prev]);
    };

    const connectAndListen = async () => {
      const token = await api.getAuthToken();
      if (!isMounted || !token) return;

      s = getSocket(token);
      if (!s) return;

      s.on('query:created', handleQueryCreated);
      s.on('query:updated', handleQueryUpdated);
    };

    connectAndListen();

    return () => {
      isMounted = false;
      if (s) {
        s.off('query:created', handleQueryCreated);
        s.off('query:updated', handleQueryUpdated);
      }
    };
  }, [isLoggedIn, currentUser]);

  const refreshQueries = async () => {
    try {
      const live = await api.getQueries();
      if (Array.isArray(live)) {
        setQueries(live);
        await AsyncStorage.setItem(STORAGE_KEYS.QUERIES, JSON.stringify(live));
      }
    } catch (err) {
      console.warn('[QueryContext] Refresh queries failed:', err);
    }
  };

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: AuthUserInfo | null; error?: string }> => {
    try {
      const res = await api.login(email, password);
      if (res.user) {
        if (res.token) {
          reconnectSocket(res.token);
        }
        setCurrentUser(res.user);
        setIsLoggedIn(true);
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(true));
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user));

        if (res.student) {
          setStudent(res.student);
          await AsyncStorage.setItem(STORAGE_KEYS.STUDENT, JSON.stringify(res.student));
        }

        // Load user's queries
        await refreshQueries();
        return { success: true, user: res.user };
      }
      return { success: false, error: 'Authentication returned no user' };
    } catch (err: any) {
      console.warn('[QueryContext] Login failed:', err.message);
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const loginWithGoogle = async (
    idToken: string
  ): Promise<{ success: boolean; user?: AuthUserInfo | null; error?: string }> => {
    try {
      const res = await api.loginWithGoogle(idToken);
      if (res.user) {
        if (res.token) {
          reconnectSocket(res.token);
        }
        setCurrentUser(res.user);
        setIsLoggedIn(true);
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(true));
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user));

        if (res.student) {
          setStudent(res.student);
          await AsyncStorage.setItem(STORAGE_KEYS.STUDENT, JSON.stringify(res.student));
        }

        await refreshQueries();
        return { success: true, user: res.user };
      }
      return { success: false, error: 'Authentication returned no user' };
    } catch (err: any) {
      console.warn('[QueryContext] Google Login failed:', err.message);
      return { success: false, error: err.message || 'Google sign-in failed' };
    }
  };

  const registerUser = async (userData: {
    email: string;
    password: string;
    name: string;
    rollNo?: string;
    program?: string;
    department?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.register(userData);
      if (res.user) {
        if (res.token) {
          reconnectSocket(res.token);
        }
        setCurrentUser(res.user);
        setIsLoggedIn(true);
        if (res.student) {
          setStudent(res.student);
        }
        await refreshQueries();
        return { success: true };
      }
      return { success: false, error: 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    disconnectSocket();
    await api.clearAuthToken();
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(false));
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    } catch (err) {
      console.warn('Failed to clear auth storage:', err);
    }
  };

  const updateStudent = async (partial: Partial<Student>) => {
    const updated = { ...student, ...partial };
    setStudent(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.STUDENT, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to persist student:', err);
    }
  };

  const addQuery = (queryData: Omit<Query, 'id' | 'code' | 'createdAt' | 'updatedAt'>): Query => {
    // Generate immediate client object for instant UI feedback
    const nextCodeNum = 4922 + queries.length;
    const tempId = `q_${Date.now()}`;
    const optimisticQuery: Query = {
      ...queryData,
      id: tempId,
      code: `#CS-${nextCodeNum}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [optimisticQuery, ...queries];
    setQueries(updated);

    // Call backend API in background to persist to database
    api.createQuery(queryData)
      .then((createdFromBackend) => {
        if (createdFromBackend && createdFromBackend.id) {
          setQueries((prev) =>
            prev.map((q) => (q.id === tempId ? createdFromBackend : q))
          );
        }
      })
      .catch((err) => {
        console.warn('[QueryContext] Backend createQuery failed, kept optimistic docket:', err);
      });

    // Add a corresponding notification
    const newNotice: NotificationItem = {
      id: `n_${Date.now()}`,
      title: 'New Query Docket Initiated',
      description: `Case ${optimisticQuery.code} (${optimisticQuery.subject}) is being triaged by Autonomous Agent.`,
      timestamp: 'Just now',
      read: false,
      type: 'update',
      linkQueryId: optimisticQuery.id,
    };
    setNotifications((prev) => [newNotice, ...prev]);

    return optimisticQuery;
  };

  const updateQueryStatus = (queryId: string, status: QueryStatus, facultyRemark?: string) => {
    const updated = queries.map((q) =>
      q.id === queryId ? { ...q, status, updatedAt: new Date().toISOString() } : q
    );
    setQueries(updated);

    api.updateQueryStatus(queryId, status, facultyRemark).catch((err) => {
      console.warn('[QueryContext] Backend updateQueryStatus failed:', err);
    });
  };

  const addAuditEntry = (queryId: string, entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullEntry: AuditEntry = {
      ...entry,
      id: `at_${Date.now()}`,
      timestamp: timeFormatted,
    };

    const updated = queries.map((q) => {
      if (q.id === queryId) {
        return {
          ...q,
          updatedAt: now.toISOString(),
          auditTranscript: [...(q.auditTranscript || []), fullEntry],
        };
      }
      return q;
    });

    setQueries(updated);

    api.addAuditEntry(queryId, entry).catch((err) => {
      console.warn('[QueryContext] Backend addAuditEntry failed:', err);
    });
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const refreshGuidelines = async () => {
    try {
      const liveGuidelines = await api.getGuidelines();
      if (Array.isArray(liveGuidelines) && liveGuidelines.length > 0) {
        setGuidelines(liveGuidelines);
      }
    } catch (err) {
      console.warn('[QueryContext] Error refreshing guidelines:', err);
    }
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  return (
    <QueryContext.Provider
      value={{
        student,
        currentUser,
        queries,
        guidelines,
        notifications,
        isLoggedIn,
        unreadNotificationCount,
        prefilledPrompt,
        setPrefilledPrompt,
        addQuery,
        updateQueryStatus,
        addAuditEntry,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        login,
        loginWithGoogle,
        registerUser,
        logout,
        updateStudent,
        refreshQueries,
        refreshGuidelines,
      }}
    >
      {children}
    </QueryContext.Provider>
  );
};

export const useQueryContext = () => {
  const context = useContext(QueryContext);
  if (!context) {
    throw new Error('useQueryContext must be used within a QueryProvider');
  }
  return context;
};
