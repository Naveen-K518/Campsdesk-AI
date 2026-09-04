import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

export interface PromptOption {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  fullPrompt: string;
}

export const defaultPrompts: PromptOption[] = [
  {
    id: 'p1',
    label: 'Attendance Shortage',
    icon: 'medical-outline',
    fullPrompt: 'Can I get attendance condonation for medical leave under Sec 4.2?',
  },
  {
    id: 'p2',
    label: 'Hall Ticket Clearance',
    icon: 'card-outline',
    fullPrompt: 'Check my mid-term clearance status and lab dues for hall ticket.',
  },
  {
    id: 'p3',
    label: 'Hostel Leave Pass',
    icon: 'bed-outline',
    fullPrompt: 'Draft an outstation hostel weekend leave pass for 3 days.',
  },
  {
    id: 'p4',
    label: 'Mess Rebate',
    icon: 'restaurant-outline',
    fullPrompt: 'How do I claim mess fee rebate for 8 days of hospital absence?',
  },
  {
    id: 'p5',
    label: 'CA-2 Re-evaluation',
    icon: 'document-text-outline',
    fullPrompt: 'What is the procedure for continuous assessment mark scrutiny under Sec 5.2?',
  },
  {
    id: 'p6',
    label: 'Bonafide Certificate',
    icon: 'school-outline',
    fullPrompt: 'Issue an instant digital bonafide certificate for passport renewal.',
  },
];

interface SuggestedPromptChipsProps {
  prompts?: PromptOption[];
  onSelectPrompt: (prompt: PromptOption) => void;
}

export const SuggestedPromptChips: React.FC<SuggestedPromptChipsProps> = ({
  prompts = defaultPrompts,
  onSelectPrompt,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {prompts.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.chip}
            onPress={() => onSelectPrompt(item)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={item.icon}
              size={14}
              color={theme.colors.primary}
              style={styles.icon}
            />
            <Text style={styles.label}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    borderRadius: theme.radii.full,
    paddingVertical: 7,
    paddingHorizontal: 12,
    ...theme.shadows.sm,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.body,
  },
});
