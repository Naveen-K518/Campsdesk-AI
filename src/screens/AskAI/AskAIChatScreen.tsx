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
import { ChatMessage, WorkflowStep } from '../../types';
import { ChatBubble } from '../../components/chat/ChatBubble';
import { SuggestedPromptChips, PromptOption } from '../../components/chat/SuggestedPromptChips';
import { UploadCard } from '../../components/cards/UploadCard';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'AskAITab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const AskAIChatScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { addQuery, prefilledPrompt, setPrefilledPrompt } = useQueryContext();
  const scrollViewRef = useRef<ScrollView>(null);

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'agent',
      text: "Hello Aarav! I am your Autonomous Student Intelligence Agent. I can cross-reference your records directly with official Senate bylaws (Attendance Sec 4.2, Exam clearance, Hostel pass, Mess rebate, or Grade re-evaluation) and autonomously route dockets to your HOD.",
      timestamp: 'Just now',
      tag: 'Autonomous Helpdesk',
    },
  ]);

  const [showUploadCard, setShowUploadCard] = useState(false);
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

    // Trigger Agentic Workflow response
    setTimeout(() => {
      generateAgentResponse(queryText);
    }, 800);
  };

  const generateAgentResponse = (queryText: string) => {
    const isAttendance = queryText.toLowerCase().includes('attendance') || queryText.toLowerCase().includes('condonation');
    const isHostel = queryText.toLowerCase().includes('hostel') || queryText.toLowerCase().includes('pass');
    const isExam = queryText.toLowerCase().includes('hall ticket') || queryText.toLowerCase().includes('clearance') || queryText.toLowerCase().includes('exam');

    let agentText = '';
    let category = 'Academic Query';
    let subject = 'Student Inquiries';
    let policySection = 'Sec 4.2';
    let policyTitle = 'Medical Leave Condonation Policy';
    let caseCode = `DOC-CS-${Math.floor(1000 + Math.random() * 9000)}`;

    const steps: WorkflowStep[] = [
      {
        id: `ws_${Date.now()}_1`,
        order: 1,
        label: 'Fetched SIS Profile',
        detail: 'Queried Campus SIS: Student #22BCS10492, CS301 Attendance recorded at 68.5%.',
        status: 'done',
        highlightKey: 'Current Record',
        highlightValue: '68.5% (Threshold 75%)',
      },
      {
        id: `ws_${Date.now()}_2`,
        order: 2,
        label: 'Evaluated Bylaws',
        detail: 'Matched with official Senate Ordinance. Eligibility criteria satisfied.',
        status: 'done',
        highlightKey: 'Bylaw Match',
        highlightValue: 'Sec 4.2 Clause 1',
      },
      {
        id: `ws_${Date.now()}_3`,
        order: 3,
        label: 'Validation Rule',
        detail: 'Condonable gap: 6.5%. Requires authentic doctor certificate endorsement.',
        status: 'done',
        highlightKey: 'Validation Gap',
        highlightValue: '6.5% Allowed',
      },
      {
        id: `ws_${Date.now()}_4`,
        order: 4,
        label: 'Decision Routing',
        detail: 'Docket prepared for CSE HOD queue (Dr. K. Radhakrishnan). Pending certificate upload.',
        status: 'in_progress',
        highlightKey: 'Escalation Target',
        highlightValue: 'Faculty HOD Queue',
      },
    ];

    if (isAttendance) {
      category = 'Attendance & Leave';
      subject = 'Medical Leave Condonation';
      agentText = "I have cross-referenced your profile with University Bylaws Sec 4.2. Your attendance in Operating Systems is currently 68.5% (6.5% below minimum). Under Senate Ordinance Sec 4.2, you are eligible for up to 10% condonation for certified hospitalization.";
      setShowUploadCard(true);
    } else if (isHostel) {
      category = 'Hostel & Mess';
      subject = 'Hostel Leave Pass';
      policySection = 'Sec 6.1';
      policyTitle = 'Hostel Leave Regulations';
      agentText = "Verified against Hostel Statute Sec 6.1: Your outstation gate pass request qualifies for automated dispatch. Ensure digital parent consent SMS is acknowledged before 6:00 PM.";
    } else if (isExam) {
      category = 'Examination & Grading';
      subject = 'Hall Ticket Clearance';
      policySection = 'Sec 8.4';
      policyTitle = 'Exam Clearance Standards';
      agentText = "Audit check against Exam Bylaws Sec 8.4: Tuition ledger cleared. Library returns confirmed. Only the lab dues slip verification remains pending.";
    } else {
      agentText = `I have evaluated your request against official university regulations. A formal advisory docket #${caseCode} has been initialized.`;
    }

    const agentMsgId = `m_${Date.now()}`;
    const agentMsg: ChatMessage = {
      id: agentMsgId,
      sender: 'agent',
      text: agentText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tag: 'Verified Policy',
      workflowExecution: steps,
      verifiedPolicy: {
        code: policySection,
        title: policyTitle,
        caseId: caseCode,
      },
    };

    setMessages((prev) => [...prev, agentMsg]);
    scrollToBottom();
  };

  const handleForwardToHOD = (attachedDoc: { name: string; size: string }) => {
    // Add new Query ticket into global store
    const created = addQuery({
      category: 'Attendance & Leave',
      subject: 'Medical Leave Condonation',
      title: 'Medical Leave Condonation (Verified by AI)',
      description: `Student submitted ${attachedDoc.name} (${attachedDoc.size}). Verified under Ordinance Sec 4.2.`,
      subLine: `Routed to HOD • Case ${attachedDoc.name}`,
      priority: 'urgent',
      status: 'under_review',
      assignedTo: 'Dr. K. Radhakrishnan (HOD CSE)',
      aiConfidence: 99.4,
      citation: 'Cited Attendance Bylaws Sec 4.2',
      daysCondonation: 6,
      workflowSteps: [
        {
          id: 'ws_f_1',
          order: 1,
          label: 'Fetched SIS Profile',
          detail: 'OS Attendance recorded at 68.5%.',
          status: 'done',
        },
        {
          id: 'ws_f_2',
          order: 2,
          label: 'Evaluated Bylaws Sec 4.2',
          detail: 'Criteria validated. 6 days condonation admissible.',
          status: 'done',
        },
        {
          id: 'ws_f_3',
          order: 3,
          label: 'Certificate Authenticated',
          detail: `${attachedDoc.name} validated and cryptographically hashed.`,
          status: 'done',
        },
        {
          id: 'ws_f_4',
          order: 4,
          label: 'Forwarded to HOD',
          detail: 'Docket forwarded to Dr. K. Radhakrishnan for executive sign-off.',
          status: 'in_progress',
        },
      ],
      auditTranscript: [
        {
          id: 'at_f_1',
          sender: 'student',
          authorName: 'Aarav Sharma (Student)',
          timestamp: 'Just now',
          text: 'Uploaded medical certificate for attendance shortage condonation.',
          attachedDoc: {
            name: attachedDoc.name,
            size: attachedDoc.size,
            caption: 'Hospital Stamped & Doctor Signed',
          },
        },
        {
          id: 'at_f_2',
          sender: 'agent',
          authorName: 'CampusDesk Autonomous Triage Agent',
          roleBadge: 'Autonomous Triage',
          timestamp: 'Just now',
          bulletPoints: [
            'Validated medical certificate format and doctor registration.',
            'Effective attendance projection: 88.5% post-condonation.',
            'Admissible under Senate Ordinance Sec 4.2.',
          ],
          actionTaken: 'Docket escalated to HOD CSE for executive approval.',
        },
      ],
    });

    setShowUploadCard(false);

    Alert.alert(
      'Docket Escalated',
      `Query ${created.code} has been autonomously routed to Dr. K. Radhakrishnan (HOD CSE). Would you like to view the live escalation pipeline?`,
      [
        { text: 'Stay in Chat', style: 'cancel' },
        {
          text: 'View Docket →',
          onPress: () => navigation.navigate('QueryDetail', { queryId: created.id }),
        },
      ]
    );
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

        {/* Document Upload Card if triggered */}
        {showUploadCard ? (
          <UploadCard
            onForwardToHOD={handleForwardToHOD}
            onSaveDraft={(f) => Alert.alert('Draft Saved', 'Your medical document draft has been saved locally.')}
          />
        ) : null}
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
          <TouchableOpacity
            onPress={() => setShowUploadCard(!showUploadCard)}
            style={styles.attachBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="attach" size={22} color={theme.colors.text.subtle} />
          </TouchableOpacity>

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
