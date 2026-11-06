import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';
import { WidgetDefinition, WidgetProps } from '../features/widget-system/types';
import { Checkbox } from '../components/ui/Checkbox';
import { IconButton } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
}

interface TodoConfig {
  tasks?: TodoItem[];
}

export const SimpleTodoWidgetComponent: React.FC<WidgetProps<TodoConfig>> = ({
  config,
  onUpdateConfig,
}) => {
  const [newTitle, setNewTitle] = useState('');

  const tasks: TodoItem[] = config?.tasks || [
    { id: '1', title: 'Plan daily focus sessions', completed: true },
    { id: '2', title: 'Review vocabulary notes', completed: false },
  ];

  const handleToggle = (id: string, completed: boolean) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed } : t));
    onUpdateConfig({ tasks: updated });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const newTask: TodoItem = {
      id: `task-${Date.now()}`,
      title: newTitle.trim(),
      completed: false,
    };
    onUpdateConfig({ tasks: [...tasks, newTask] });
    setNewTitle('');
  };

  const handleDelete = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    onUpdateConfig({ tasks: updated });
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="h-full flex flex-col justify-between text-xs select-none">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <CheckSquare className="h-3.5 w-3.5 text-primary" />
          Tasks Preview
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">
          {completedCount}/{tasks.length}
        </span>
      </div>

      <form onSubmit={handleAddTask} className="my-2 flex items-center gap-1.5">
        <Input
          placeholder="Add task..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="h-7 text-xs"
        />
        <IconButton
          size="sm"
          variant="secondary"
          aria-label="Add task"
          type="submit"
          className="h-7 w-7 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
        </IconButton>
      </form>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {tasks.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-4">All tasks completed! 🎉</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="group flex items-center justify-between p-1.5 rounded-lg border border-border/30 bg-card hover:bg-secondary/40 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={(checked) => handleToggle(task.id, checked)}
                />
                <span
                  className={`text-[11px] truncate ${
                    task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                  }`}
                >
                  {task.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(task.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="text-[10px] text-muted-foreground/80 pt-1 border-t border-border/30">
        Local Task State
      </div>
    </div>
  );
};

export const SimpleTodoWidget: WidgetDefinition<TodoConfig> = {
  type: 'simple-todo',
  name: 'Task List Preview',
  description: 'Quick checkable todo list to organize immediate priorities.',
  category: 'productivity',
  icon: CheckSquare,
  defaultConfig: {
    tasks: [
      { id: '1', title: 'Plan daily focus sessions', completed: true },
      { id: '2', title: 'Review vocabulary notes', completed: false },
    ],
  },
  defaultDimensions: { w: 4, h: 3 },
  minDimensions: { w: 3, h: 2 },
  component: SimpleTodoWidgetComponent,
};
