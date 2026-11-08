import React, { useState, useEffect, useRef } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Search,
  X,
  RefreshCw,
  Tag,
} from 'lucide-react';
import { WidgetDefinition, WidgetProps } from '../features/widget-system/types';
import { useTodoStore, TodoFilterType } from '../features/todo/todoStore';
import { TodoPriority, STORAGE_KEY_TODO_LAST_UPDATED_AT } from '../services/database/repositories/todoRepository';
import { Checkbox } from '../components/ui/Checkbox';
import { IconButton, Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { cn } from '../utils/cn';
import { useTranslation } from '../services/i18n';

export interface TodoWidgetConfig {
  defaultFilter?: TodoFilterType;
  showPriority?: boolean;
  showDueDate?: boolean;
  showCategory?: boolean;
}

const PRIORITY_CONFIG: Record<TodoPriority, { label: string; badgeClass: string; dotClass: string }> = {
  urgent: {
    label: 'Urgent',
    badgeClass: 'text-red-700 dark:text-red-400 bg-red-500/10 border-red-500/20',
    dotClass: 'bg-red-500',
  },
  high: {
    label: 'High',
    badgeClass: 'text-orange-700 dark:text-orange-400 bg-orange-500/10 border-orange-500/20',
    dotClass: 'bg-orange-500',
  },
  medium: {
    label: 'Med',
    badgeClass: 'text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
    dotClass: 'bg-blue-500',
  },
  low: {
    label: 'Low',
    badgeClass: 'text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
    dotClass: 'bg-zinc-400',
  },
};

export const TodoWidgetComponent: React.FC<WidgetProps<TodoWidgetConfig>> = ({
  workspaceId,
  config,
}) => {
  const { t } = useTranslation();
  const {
    tasks,
    status,
    error,
    activeFilter,
    searchQuery,
    initialize,
    loadTasks,
    setFilter,
    setSearchQuery,
    addTask,
    toggleTask,
    deleteTask,
    clearCompleted,
  } = useTodoStore();

  const [newTitle, setNewTitle] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<TodoPriority>('medium');
  const [selectedDueDate, setSelectedDueDate] = useState<number | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddingDetails, setIsAddingDetails] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize store and migration on mount or when workspaceId changes
  useEffect(() => {
    if (workspaceId) {
      initialize(workspaceId);
    }
  }, [workspaceId, initialize]);

  // Live synchronization:
  // Listens to STORAGE_KEY_TODO_LAST_UPDATED_AT to reload tasks when changes occur in other tabs
  useEffect(() => {
    const ext =
      typeof browser !== 'undefined' && browser.storage?.onChanged
        ? browser
        : typeof chrome !== 'undefined' && chrome.storage?.onChanged
        ? chrome
        : null;

    if (!ext || !workspaceId) return;

    const handleStorageChange = (changes: Record<string, any>, areaName: string) => {
      if (areaName === 'local' && changes[STORAGE_KEY_TODO_LAST_UPDATED_AT]) {
        loadTasks(workspaceId);
      }
    };

    ext.storage.onChanged.addListener(handleStorageChange);
    return () => {
      ext.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [loadTasks, workspaceId]);

  // Set default filter from config if provided
  useEffect(() => {
    if (config?.defaultFilter && config.defaultFilter !== activeFilter) {
      setFilter(config.defaultFilter);
    }
  }, [config?.defaultFilter, activeFilter, setFilter]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed || !workspaceId) return;

    await addTask(workspaceId, trimmed, {
      priority: selectedPriority,
      dueDate: selectedDueDate,
      category: selectedCategory.trim() || undefined,
    });

    setNewTitle('');
    setSelectedPriority('medium');
    setSelectedDueDate(undefined);
    setSelectedCategory('');
    setIsAddingDetails(false);
    inputRef.current?.focus();
  };

  const handleToggle = async (id: string) => {
    if (workspaceId) {
      await toggleTask(id, workspaceId);
    }
  };

  const handleDelete = async (id: string) => {
    if (workspaceId) {
      await deleteTask(id, workspaceId);
    }
  };

  const handleClearCompleted = async () => {
    if (workspaceId) {
      await clearCompleted(workspaceId);
    }
  };

  // Helper date formatter
  const formatDueDate = (dueTimestamp: number) => {
    const due = new Date(dueTimestamp);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDay = new Date(due);
    dueDay.setHours(0, 0, 0, 0);

    const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffDays === 0) return { text: 'Today', isOverdue: false };
    if (diffDays === 1) return { text: 'Tomorrow', isOverdue: false };
    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true };
    return {
      text: due.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      isOverdue: false,
    };
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  return (
    <div className="h-full flex flex-col justify-between text-xs select-none p-1">
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-1.5 min-w-0">
          <CheckSquare className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold text-foreground text-sm tracking-tight truncate">
            {t('widgets.todo.title')}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground ml-1 px-1.5 py-0.5 rounded-full bg-secondary/60">
            {completedCount}/{totalCount}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <IconButton
            size="sm"
            variant="ghost"
            aria-label={isSearchOpen ? 'Close search' : (t('widgets.todo.searchTasksPlaceholder') || 'Search tasks')}
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (isSearchOpen) setSearchQuery('');
            }}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <Search className="h-3.5 w-3.5" />
          </IconButton>

          {completedCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearCompleted}
              aria-label={t('widgets.todo.clearDone')}
              className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-destructive"
            >
              {t('widgets.todo.clearDone')}
            </Button>
          )}
        </div>
      </div>

      {/* 2. Collapsible Search Bar */}
      {isSearchOpen && (
        <div className="pt-2 animate-in fade-in duration-100 flex items-center gap-1">
          <Input
            placeholder={t('widgets.todo.searchTasksPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-6 text-xs"
            autoFocus
          />
          {searchQuery && (
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Clear search query"
              onClick={() => setSearchQuery('')}
              className="h-6 w-6"
            >
              <X className="h-3.5 w-3.5" />
            </IconButton>
          )}
        </div>
      )}

      {/* 3. Filter Navigation Bar */}
      <div className="flex items-center gap-1 py-2 border-b border-border/30 overflow-x-auto no-scrollbar">
        {(['all', 'active', 'completed', 'today'] as TodoFilterType[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={cn(
              'px-2 py-0.5 rounded-md text-[11px] font-medium capitalize transition-colors',
              activeFilter === tab
                ? 'bg-secondary text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            )}
            aria-label={`Filter by ${tab} tasks`}
          >
            {t(`widgets.todo.filters.${tab}`) || tab}
          </button>
        ))}
      </div>

      {/* 4. Quick Add Form */}
      <form onSubmit={handleCreateTask} className="py-2 border-b border-border/30">
        <div className="flex items-center gap-1.5">
          <Input
            ref={inputRef}
            placeholder={t('widgets.todo.addTaskPlaceholder')}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="h-7 text-xs flex-1"
            aria-label="New task title"
          />
          <IconButton
            type="button"
            size="sm"
            variant={isAddingDetails ? 'secondary' : 'ghost'}
            aria-label="Toggle task options"
            onClick={() => setIsAddingDetails(!isAddingDetails)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
          >
            <Tag className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            type="submit"
            size="sm"
            variant="primary"
            aria-label="Add task"
            disabled={!newTitle.trim()}
            className="h-7 w-7 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
          </IconButton>
        </div>

        {/* Extended details (Priority, Due Date, Category) */}
        {isAddingDetails && (
          <div className="mt-2 pt-2 border-t border-border/20 grid grid-cols-2 gap-1.5 animate-in fade-in duration-100">
            {/* Priority Selector */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">{t('widgets.todo.priorityLabel')}</span>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value as TodoPriority)}
                className="text-[10px] h-6 px-1.5 rounded border border-border bg-card text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                aria-label="Select task priority"
              >
                <option value="low">{t('widgets.todo.priorities.low')}</option>
                <option value="medium">{t('widgets.todo.priorities.medium')}</option>
                <option value="high">{t('widgets.todo.priorities.high')}</option>
                <option value="urgent">{t('widgets.todo.priorities.urgent')}</option>
              </select>
            </div>

            {/* Quick Due Date */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">{t('widgets.todo.dueLabel')}</span>
              <select
                value={selectedDueDate ? 'set' : 'none'}
                onChange={(e) => {
                  if (e.target.value === 'today') {
                    const today = new Date();
                    today.setHours(23, 59, 59, 999);
                    setSelectedDueDate(today.getTime());
                  } else if (e.target.value === 'tomorrow') {
                    const tom = new Date();
                    tom.setDate(tom.getDate() + 1);
                    tom.setHours(23, 59, 59, 999);
                    setSelectedDueDate(tom.getTime());
                  } else {
                    setSelectedDueDate(undefined);
                  }
                }}
                className="text-[10px] h-6 px-1.5 rounded border border-border bg-card text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                aria-label="Select task due date"
              >
                <option value="none">{t('widgets.todo.dueDates.noDate')}</option>
                <option value="today">{t('widgets.todo.dueDates.today')}</option>
                <option value="tomorrow">{t('widgets.todo.dueDates.tomorrow')}</option>
              </select>
            </div>
          </div>
        )}
      </form>

      {/* 5. Task List / Loading / Error / Empty States */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 py-1">
        {status === 'loading' && tasks.length === 0 ? (
          <div className="space-y-2 py-4">
            <div className="h-6 w-full rounded bg-muted/40 animate-pulse" />
            <div className="h-6 w-full rounded bg-muted/30 animate-pulse" />
            <div className="h-6 w-3/4 rounded bg-muted/20 animate-pulse" />
          </div>
        ) : error ? (
          <div className="p-3 my-2 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-[11px] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            {workspaceId && (
              <IconButton
                size="sm"
                variant="ghost"
                aria-label="Retry loading tasks"
                onClick={() => loadTasks(workspaceId)}
                className="h-5 w-5"
              >
                <RefreshCw className="h-3 w-3" />
              </IconButton>
            )}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <CheckSquare className="h-6 w-6 stroke-1 text-muted-foreground/40 mb-1" />
            <p className="text-[11px] font-medium">
              {activeFilter === 'completed'
                ? t('widgets.todo.noCompletedTasks')
                : activeFilter === 'today'
                ? t('widgets.todo.noTasksToday')
                : t('widgets.todo.noTasksFound')}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              {t('widgets.todo.typeAboveHint')}
            </p>
          </div>
        ) : (
          tasks.map((task) => {
            const priorityInfo = PRIORITY_CONFIG[task.priority || 'medium'];
            const dueInfo = task.dueDate ? formatDueDate(task.dueDate) : null;

            return (
              <div
                key={task.id}
                className={cn(
                  'group flex items-center justify-between p-1.5 rounded-lg border border-border/30 bg-card hover:bg-secondary/40 transition-colors',
                  task.completed && 'opacity-70 bg-card/50'
                )}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2 flex-1">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => handleToggle(task.id)}
                    aria-label={`Mark task "${task.title}" as ${task.completed ? 'active' : 'completed'}`}
                  />

                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span
                      className={cn(
                        'text-[11px] truncate',
                        task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                      )}
                    >
                      {task.title}
                    </span>

                    {/* Priority Indicator Badge */}
                    {task.priority && task.priority !== 'medium' && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-1 py-0.2 rounded border text-[9px] font-medium leading-none shrink-0',
                          priorityInfo.badgeClass
                        )}
                        title={`Priority: ${priorityInfo.label}`}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', priorityInfo.dotClass)} />
                        {priorityInfo.label}
                      </span>
                    )}

                    {/* Due Date Badge */}
                    {dueInfo && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-[9px] px-1 py-0.2 rounded border shrink-0',
                          dueInfo.isOverdue
                            ? 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20'
                            : 'text-muted-foreground border-border/40'
                        )}
                      >
                        <Calendar className="h-2.5 w-2.5" />
                        {dueInfo.text}
                      </span>
                    )}

                    {/* Category Badge */}
                    {task.category && (
                      <span className="text-[9px] text-muted-foreground/70 bg-muted/40 px-1 rounded truncate max-w-[60px]">
                        #{task.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleDelete(task.id)}
                  aria-label={`Delete task "${task.title}"`}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive transition-opacity focus:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 6. Footer Status */}
      <div className="text-[10px] text-muted-foreground/80 pt-1 border-t border-border/30 flex items-center justify-between">
        <span>Dexie IndexedDB Persistent</span>
        {completedCount > 0 && <span>{Math.round((completedCount / totalCount) * 100)}% done</span>}
      </div>
    </div>
  );
};

export const TodoWidget: WidgetDefinition<TodoWidgetConfig> = {
  type: 'todo',
  name: 'Task List',
  description: 'Manage prioritized tasks, deadlines, and daily action items.',
  category: 'productivity',
  icon: CheckSquare,
  defaultConfig: {
    defaultFilter: 'all',
    showPriority: true,
    showDueDate: true,
    showCategory: true,
  },
  defaultDimensions: { w: 4, h: 4 },
  minDimensions: { w: 3, h: 3 },
  component: TodoWidgetComponent,
};
