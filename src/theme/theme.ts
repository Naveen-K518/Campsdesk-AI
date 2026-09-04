export const theme = {
  colors: {
    // Brand & primary
    primary: '#4F46E5',
    primaryGradient: ['#4F46E5', '#3B82F6'] as const,
    primaryLight: '#EEF2FF',
    primaryBorder: '#C7D2FE',
    
    // Backgrounds & surfaces
    splash: '#0B0F1A',
    splashCard: '#151C2E',
    background: '#F4F5FB',
    card: '#FFFFFF',
    cardAlt: '#F9FAFB',
    border: '#E5E7EB',
    borderSubtle: '#F3F4F6',

    // Status colors
    success: {
      text: '#0EA5A0',
      bg: '#F0FDFA',
      border: '#CCFBF1',
      dot: '#0EA5A0',
    },
    pending: {
      text: '#D97706',
      bg: '#FFFBEB',
      border: '#FEF3C7',
      dot: '#D97706',
    },
    urgent: {
      text: '#DC2626',
      bg: '#FEF2F2',
      border: '#FEE2E2',
      dot: '#DC2626',
    },
    info: {
      text: '#2563EB',
      bg: '#EFF6FF',
      border: '#DBEAFE',
      dot: '#2563EB',
    },
    aiResolved: {
      text: '#6366F1',
      bg: '#EEF2FF',
      border: '#E0E7FF',
      dot: '#6366F1',
    },
    liveSync: {
      text: '#0891B2',
      bg: '#ECFEFF',
      border: '#CFFAFE',
      dot: '#0891B2',
    },

    // Typography colors
    text: {
      heading: '#111827',
      body: '#4B5563',
      muted: '#9CA3AF',
      subtle: '#6B7280',
      inverse: '#FFFFFF',
      brand: '#4F46E5',
    },
  },

  fonts: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },

  radii: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    full: 9999,
  },

  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: '#4F46E5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    glow: {
      shadowColor: '#4F46E5',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 18,
      elevation: 8,
    },
  },
};

export type Theme = typeof theme;
