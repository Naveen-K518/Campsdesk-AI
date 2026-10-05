import { NavigatorScreenParams } from '@react-navigation/native';
import { Query } from '../types';

export type MainTabParamList = {
  HomeTab: undefined;
  HistoryTab: { filterStatus?: string };
  AskAITab: { prefilledPrompt?: string; guidelineSection?: string };
  GuidelinesTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  FacultyDashboard: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  QueryDetail: { queryId: string };
  Notifications: undefined;
  GuidelineDetail: { guidelineId: string };
  Settings: undefined;
  EditProfile: undefined;
};
