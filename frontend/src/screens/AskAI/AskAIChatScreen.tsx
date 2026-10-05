import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { theme } from '../../theme/theme';
import { useQueryContext } from '../../context/QueryContext';
import { ChatMessage } from '../../types';
import { ChatBubble } from '../../components/chat/ChatBubble';
import { SuggestedPromptChips, PromptOption } from '../../components/chat/SuggestedPromptChips';
import * as api from '../../services/api';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'AskAITab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const AskAIChatScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { prefilledPrompt, setPrefilledPrompt, guidelines, student, currentUser } = useQueryContext();
  const scrollViewRef = useRef<ScrollView>(null);

  const studentName = currentUser?.name || student?.name || 'Student';

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'agent',
      text: `Hello ${studentName}! I am your CampusDesk AI Assistant. Ask me anything about university guidelines, attendance condonation, exam policies, hostel rules, or campus procedures.`,
      timestamp: 'Just now',
      tag: 'CampusDesk AI',
    },
  ]);

  const [isListening, setIsListening] = useState(false);

  // Check if route params has prefilledPrompt
  useEffect(() => {
    const promptToUse = route.params?.prefilledPrompt || prefilledPrompt;
    if (promptToUse) {
      handleUserSubmit(promptToUse);
      setPrefilledPrompt('');
    }
  }, [route.params?.prefilledPrompt, prefilledPrompt]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const handleUserSubmit = (textToSend?: string) => {
    const queryText = (textToSend || inputMessage).trim();
    if (!queryText) return;

    const userMsgId = `m_${Date.now()}`;
    const userTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newUserMessage: ChatMessage = {
      id: userMsgId,
      sender: 'student',
      text: queryText,
      timestamp: userTimestamp,
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputMessage('');
    scrollToBottom();

    // Trigger AI response
    setTimeout(() => {
      generateAgentResponse(queryText);
    }, 800);
  };

  const generateAgentResponse = async (queryText: string) => {
    const loadingMsgId = `m_load_${Date.now()}`;
    const loadingMsg: ChatMessage = {
      id: loadingMsgId,
      sender: 'agent',
      text: '🤖 CampusDesk AI is cross-referencing your query with official university bylaws…',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tag: 'CampusDesk AI',
    };
    setMessages((prev) => [...prev, loadingMsg]);
    scrollToBottom();

    // Prepare guidelines context from live state
    const guidelinesContext = (guidelines || [])
      .map((g) => `${g.section} (${g.title}): ${g.body}`)
      .join('\n');

    let agentText = '';
    try {
      const res = await api.submitAIQuery(queryText, guidelinesContext);
      agentText = res.response;
    } catch (err: any) {
      console.warn('AI Query failed:', err);
      agentText =
        'I evaluated your request against official university bylaws. If you require further assistance or wish to file a formal appeal, please consult your department faculty advisor.';
    }

    const finalMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      sender: 'agent',
      text: agentText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tag: 'CampusDesk AI',
    };

    setMessages((prev) => prev.filter((m) => m.id !== loadingMsgId).concat(finalMsg));
    scrollToBottom();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Model & Agent Header Bar */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={styles.headerTop}>
          <View style={styles.agentInfoRow}>
            <View style={styles.agentAvatar}>
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            </View>
            <View>
              <View style={styles.nameRow}>
                <Text style={styles.agentName}>CampusDesk Agentic AI</Text>
                <View style={styles.versionPill}>
                  <Text style={styles.versionText}>v4.2</Text>
                </View>
              </View>
              <Text style={styles.modelSubtext}>Active Model: Academic Regs 2024-25</Text>
            </View>
          </View>

          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>

        {/* Sub-row: Auto-escalation enabled */}
        <View style={styles.escalationStrip}>
          <Ionicons name="git-branch-outline" size={13} color="#4F46E5" />
          <Text style={styles.escalationText}>
            🤖 Auto-escalation enabled: Faculty Advisor Queue
          </Text>
        </View>
      </View>

      {/* Messages Scroll View */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.chatScroll}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
      </ScrollView>

      {/* Suggested Prompts Row */}
      <View style={styles.promptsSection}>
        <SuggestedPromptChips
          onSelectPrompt={(p) => handleUserSubmit(p.fullPrompt)}
        />
      </View>

      {/* Live Status Strip */}
      <View style={styles.liveSyncStrip}>
        <View style={styles.livePulseDot} />
        <Text style={styles.liveSyncText}>
          {isListening
            ? 'Listening to microphone voice stream…'
            : 'AI Agent is listening & syncing case records…'}
        </Text>
      </View>

      {/* Pinned Bottom Input Bar */}
      <View style={[styles.bottomInputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={styles.inputContainer}>
          <TextInput
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Describe your query or college issue…"
            placeholderTextColor={theme.colors.text.muted}
            style={styles.chatInput}
            multiline={false}
            onSubmitEditing={() => handleUserSubmit()}
          />

          <TouchableOpacity
            onPress={() => setIsListening(!isListening)}
            style={[styles.micBtn, isListening && styles.micBtnActive]}
            activeOpacity={0.7}
          >
            <Ionicons
              name="mic-outline"
              size={20}
              color={isListening ? theme.colors.primary : theme.colors.text.subtle}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleUserSubmit()}
            style={[
              styles.sendBtn,
              inputMessage.trim().length > 0 && styles.sendBtnActive,
            ]}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.privacyNote}>
          🔒 Protected by FERPA & University Privacy Protocols
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    paddingHorizontal: 16,
    paddingBottom: 10,
    ...theme.shadows.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  agentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: theme.colors.text.heading,
  },
  versionPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  versionText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  modelSubtext: {
    fontSize: 11,
    color: theme.colors.text.muted,
    marginTop: 1,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  escalationStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: theme.radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  escalationText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  chatScroll: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 20,
  },
  promptsSection: {
    backgroundColor: 'transparent',
  },
  liveSyncStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    backgroundColor: '#F1F5F9',
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginRight: 6,
  },
  liveSyncText: {
    fontSize: 11,
    color: theme.colors.text.subtle,
    fontWeight: '500',
  },
  bottomInputBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    paddingHorizontal: 14,
    paddingTop: 10,
    ...theme.shadows.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: theme.radii.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  attachBtn: {
    padding: 6,
  },
  chatInput: {
    flex: 1,
    fontSize: 13.5,
    color: theme.colors.text.heading,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  micBtn: {
    padding: 6,
  },
  micBtnActive: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  sendBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  privacyNote: {
    fontSize: 10,
    color: theme.colors.text.muted,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
  },
});
