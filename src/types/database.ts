export interface WorkspaceEntity {
  id: string;
  name: string;
  icon: string; // Lucide icon identifier or emoji
  color?: string;
  isDefault: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface LayoutItem {
  widgetInstanceId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface LayoutPresetEntity {
  id: string;
  workspaceId: string;
  name: string;
  isDefault: boolean;
  items: LayoutItem[];
  createdAt: number;
  updatedAt: number;
}

export interface WidgetInstanceEntity {
  id: string;
  workspaceId: string;
  widgetType: string;
  title?: string;
  config: Record<string, unknown>;
  isEnabled: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface TodoEntity {
  id: string;
  workspaceId?: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: number;
  category?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface NoteEntity {
  id: string;
  workspaceId?: string;
  title: string;
  content: string;
  isPinned: boolean;
  color?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface StickyNoteEntity {
  id: string;
  workspaceId: string;
  content: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface BookmarkGroupEntity {
  id: string;
  workspaceId?: string;
  title: string;
  icon?: string;
  color?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface BookmarkEntity {
  id: string;
  groupId: string;
  title: string;
  url: string;
  iconUrl?: string;
  customColor?: string;
  isFavorite: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface VocabularyEntity {
  id: string;
  workspaceId?: string;
  word: string;
  reading?: string;
  meaning: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  category: string;
  status: 'new' | 'learning' | 'mastered';
  createdAt: number;
  updatedAt: number;
}

export interface ResourceEntity {
  id: string;
  workspaceId?: string;
  title: string;
  url: string;
  description?: string;
  category?: string;
  tags: string[];
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FocusSessionEntity {
  id: string;
  workspaceId?: string;
  type: 'pomodoro' | 'short_break' | 'long_break' | 'study';
  category?: string;
  durationMinutes: number;
  startedAt: number;
  completedAt: number;
  completed: boolean;
}

export interface DailyGoalEntity {
  id: string;
  workspaceId?: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit?: string;
  dateString: string; // YYYY-MM-DD
  createdAt: number;
  updatedAt: number;
}

export interface CalendarEventEntity {
  id: string;
  workspaceId?: string;
  title: string;
  description?: string;
  startDate: number;
  endDate: number;
  isAllDay: boolean;
  category?: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettingsEntity {
  id: string; // 'current_settings'
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  fontFamily: string;
  fontSize: 'sm' | 'md' | 'lg';
  backgroundType: 'color' | 'gradient' | 'image';
  backgroundValue: string;
  widgetOpacity: number;
  widgetBlur: number;
  activeWorkspaceId: string;
  userName?: string;
  updatedAt: number;
}
