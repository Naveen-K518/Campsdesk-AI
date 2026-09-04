import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Student, Query, Guideline, NotificationItem, AuditEntry, QueryStatus } from '../types';
import { mockStudent, mockQueries, mockGuidelines, mockNotifications } from '../data/mockData';

interface QueryContextType {
  student: Student;
  queries: Query[];
  guidelines: Guideline[];
  notifications: NotificationItem[];
  isLoggedIn: boolean;
  unreadNotificationCount: number;
  prefilledPrompt: string;
  setPrefilledPrompt: (prompt: string) => void;
  addQuery: (newQuery: Omit<Query, 'id' | 'code' | 'createdAt' | 'updatedAt'>) => Query;
  updateQueryStatus: (queryId: string, status: QueryStatus) => void;
  addAuditEntry: (queryId: string, entry: Omit<AuditEntry, 'id' | 'timestamp'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  login: () => void;
  logout: () => void;
  updateStudent: (partial: Partial<Student>) => void;
}

const STORAGE_KEYS = {
  QUERIES: '@campusdesk_queries_v1',
  AUTH: '@campusdesk_auth_v1',
  STUDENT: '@campusdesk_student_v1',
};

const QueryContext = createContext<QueryContextType | undefined>(undefined);

export const QueryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [student, setStudent] = useState<Student>(mockStudent);
  const [queries, setQueries] = useState<Query[]>(mockQueries);
  const [guidelines] = useState<Guideline[]>(mockGuidelines);
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [prefilledPrompt, setPrefilledPrompt] = useState<string>('');

  // Load persisted state from AsyncStorage on startup
  useEffect(() => {
    const loadStorage = async () => {
      try {
        const [savedAuth, savedQueries, savedStudent] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.AUTH),
          AsyncStorage.getItem(STORAGE_KEYS.QUERIES),
          AsyncStorage.getItem(STORAGE_KEYS.STUDENT),
        ]);

        if (savedAuth !== null) {
          setIsLoggedIn(JSON.parse(savedAuth));
        }
        if (savedQueries !== null) {
          const parsed = JSON.parse(savedQueries);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setQueries(parsed);
          }
        }
        if (savedStudent !== null) {
          setStudent(JSON.parse(savedStudent));
        }
      } catch (err) {
        console.warn('Failed to load storage state:', err);
      }
    };

    loadStorage();
  }, []);

  const saveQueriesToStorage = async (updated: Query[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.QUERIES, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to persist queries:', err);
    }
  };

  const login = async () => {
    setIsLoggedIn(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(true));
    } catch (err) {
      console.warn('Failed to persist auth:', err);
    }
  };

  const logout = async () => {
    setIsLoggedIn(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(false));
    } catch (err) {
      console.warn('Failed to persist auth:', err);
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
    const nextCodeNum = 4922 + queries.length;
    const newQuery: Query = {
      ...queryData,
      id: `q_${Date.now()}`,
      code: `#CS-${nextCodeNum}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newQuery, ...queries];
    setQueries(updated);
    saveQueriesToStorage(updated);

    // Also add a corresponding notification
    const newNotice: NotificationItem = {
      id: `n_${Date.now()}`,
      title: 'New Query Docket Initiated',
      description: `Case ${newQuery.code} (${newQuery.subject}) is being triaged by Autonomous Agent.`,
      timestamp: 'Just now',
      read: false,
      type: 'update',
      linkQueryId: newQuery.id,
    };
    setNotifications((prev) => [newNotice, ...prev]);

    return newQuery;
  };

  const updateQueryStatus = (queryId: string, status: QueryStatus) => {
    const updated = queries.map((q) =>
      q.id === queryId ? { ...q, status, updatedAt: new Date().toISOString() } : q
    );
    setQueries(updated);
    saveQueriesToStorage(updated);
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
    saveQueriesToStorage(updated);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  return (
    <QueryContext.Provider
      value={{
        student,
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
        logout,
        updateStudent,
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
