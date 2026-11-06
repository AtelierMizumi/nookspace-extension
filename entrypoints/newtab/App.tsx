import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  Sliders,
  Bell,
  Palette,
  Compass,
  ArrowRight,
  Plus,
  Trash2,
} from 'lucide-react';
import { AppShell } from '../../src/components/layout/AppShell';
import { WorkspaceHeader } from '../../src/components/layout/WorkspaceHeader';
import {
  Button,
  IconButton,
  Input,
  Textarea,
  Checkbox,
  Switch,
  Slider,
  Separator,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  IconContainer,
  EmptyState,
  Skeleton,
  Tooltip,
  Dropdown,
  Modal,
  Popover,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../../src/components/ui';

export const App: React.FC = () => {
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [sampleChecked, setSampleChecked] = useState<boolean>(true);
  const [sampleSwitch, setSampleSwitch] = useState<boolean>(true);
  const [sliderValue, setSliderValue] = useState<number>(85);
  const [sampleInput, setSampleInput] = useState<string>('Daily Deep Work');

  return (
    <AppShell
      workspaceName="Personal"
      isEditMode={isEditMode}
      onToggleEditMode={() => setIsEditMode(!isEditMode)}
      onOpenSettings={() => setIsSettingsOpen(true)}
    >
      {/* Workspace Header (Clock, Greeting, Date) */}
      <WorkspaceHeader userName="Architect" />

      {/* Edit Mode Active Banner (When toggled) */}
      {isEditMode && (
        <div className="w-full mb-6 p-3 rounded-lg border border-primary/30 bg-primary/10 text-primary flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="h-4 w-4" />
            <span>Edit Mode Active — Drag handles & grid boundaries will appear in Phase 4.</span>
          </div>
          <Button size="sm" variant="primary" onClick={() => setIsEditMode(false)}>
            Save Layout
          </Button>
        </div>
      )}

      {/* Design System & Primitives Interactive Showcase */}
      <div className="w-full mt-2 space-y-6">
        <Tabs defaultValue="overview">
          <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-4">
            <TabsList>
              <TabsTrigger value="overview" icon={<Layers className="h-3.5 w-3.5" />}>
                Overview
              </TabsTrigger>
              <TabsTrigger value="actions" icon={<Sparkles className="h-3.5 w-3.5" />}>
                Actions & Inputs
              </TabsTrigger>
              <TabsTrigger value="overlays" icon={<Sliders className="h-3.5 w-3.5" />}>
                Overlays & Feedback
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="outline" size="sm">
                Phase 1 Verified
              </Badge>
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Design Tokens Status */}
              <Card hoverable>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-primary" />
                      Design Tokens
                    </CardTitle>
                    <Badge variant="success" size="sm">
                      Active
                    </Badge>
                  </div>
                  <CardDescription>CSS Variables & Semantic Palette</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Theme Strategy</span>
                    <span className="font-mono font-medium">Light / Dark / System</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Flash Prevention</span>
                    <span className="font-medium text-emerald-500">Zero White Flash</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">Elevation</span>
                    <span className="font-mono">Subtle & Elevation</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Tooltip content="Tokens configured in src/styles/globals.css">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      100% Tokenized Design System
                    </span>
                  </Tooltip>
                </CardFooter>
              </Card>

              {/* Card 2: Interactive Controls */}
              <Card hoverable>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-primary" />
                      Interactive Controls
                    </CardTitle>
                    <Badge variant="secondary" size="sm">
                      Accessible
                    </Badge>
                  </div>
                  <CardDescription>Keyboard navigable input primitives</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <Checkbox
                    checked={sampleChecked}
                    onCheckedChange={setSampleChecked}
                    label="Active Workspace Isolation"
                  />
                  <Switch
                    checked={sampleSwitch}
                    onCheckedChange={setSampleSwitch}
                    label="Deterministic Timer Engine"
                  />
                  <Slider
                    label="Widget Opacity"
                    value={sliderValue}
                    onChange={setSliderValue}
                    valueDisplay={`${sliderValue}%`}
                  />
                </CardContent>
                <CardFooter>
                  <span className="text-[11px] text-muted-foreground">
                    Native accessibility with focus-visible rings
                  </span>
                </CardFooter>
              </Card>

              {/* Card 3: Ready for Widgets */}
              <Card hoverable>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Compass className="h-4 w-4 text-primary" />
                      Widget Container Shell
                    </CardTitle>
                    <Badge variant="outline" size="sm">
                      Phase 2 Next
                    </Badge>
                  </div>
                  <CardDescription>Pre-configured for react-grid-layout</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-12 w-full" />
                </CardContent>
                <CardFooter>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                    onClick={() => setIsSettingsOpen(true)}
                  >
                    Open Settings Dialog
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: ACTIONS & INPUTS */}
          <TabsContent value="actions">
            <Card>
              <CardHeader>
                <CardTitle>Button & Input Variants</CardTitle>
                <CardDescription>Standardized states, sizes and iconography</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Buttons Row */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Button Variants
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="primary">Primary Action</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="destructive" leftIcon={<Trash2 className="h-4 w-4" />}>
                      Destructive
                    </Button>
                    <Button isLoading size="sm">
                      Loading
                    </Button>
                    <IconButton aria-label="Add item" variant="outline">
                      <Plus className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>

                <Separator />

                {/* Inputs Row */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Text Inputs & Textareas
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Task or goal title..."
                      value={sampleInput}
                      onChange={(e) => setSampleInput(e.target.value)}
                    />
                    <Input placeholder="Invalid input example" error="Title cannot be empty" />
                    <div className="md:col-span-2">
                      <Textarea placeholder="Quick scratch note with markdown formatting..." />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Badges */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Semantic Badges
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="default">Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="success">Completed</Badge>
                    <Badge variant="warning">In Progress</Badge>
                    <Badge variant="destructive">Urgent</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: OVERLAYS & FEEDBACK */}
          <TabsContent value="overlays">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Overlays Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Floating Overlays</CardTitle>
                  <CardDescription>Tooltips, Popovers & Dropdown menus</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-3">
                  <Tooltip content="Pomodoro Focus Session">
                    <Button variant="outline" size="sm" leftIcon={<Clock className="h-4 w-4" />}>
                      Hover for Tooltip
                    </Button>
                  </Tooltip>

                  <Popover
                    trigger={
                      <Button variant="secondary" size="sm" leftIcon={<Bell className="h-4 w-4" />}>
                        Click for Popover
                      </Button>
                    }
                    content={
                      <div className="w-56 space-y-2 text-xs">
                        <div className="font-semibold text-foreground">Timer Notifications</div>
                        <p className="text-muted-foreground">
                          Sound and desktop alerts are managed via the Browser API abstraction layer.
                        </p>
                      </div>
                    }
                  />

                  <Dropdown
                    trigger={
                      <Button variant="outline" size="sm">
                        Options Dropdown
                      </Button>
                    }
                    items={[
                      { id: '1', label: 'Export Workspace JSON', onClick: () => {} },
                      { id: '2', label: 'Duplicate Layout', onClick: () => {} },
                      { id: '3', label: 'Clear Cache', destructive: true, separatorAfter: true, onClick: () => {} },
                    ]}
                  />
                </CardContent>
              </Card>

              {/* Empty & Async States */}
              <Card>
                <CardHeader>
                  <CardTitle>Empty & Async States</CardTitle>
                  <CardDescription>Graceful fallbacks for empty lists or widgets</CardDescription>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    icon={<Clock className="h-5 w-5" />}
                    title="No Focus Sessions Today"
                    description="Start a 25-minute Pomodoro session to log your focus time."
                    action={
                      <Button size="sm" variant="primary">
                        Start Session
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Settings Modal Dialog Component */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Workspace Preferences"
        description="Configure your workspace appearance and behavior."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsSettingsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsSettingsOpen(false)}>
              Save Preferences
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <span className="font-medium text-foreground">Workspace Name</span>
            <Input defaultValue="Personal" />
          </div>
          <div className="space-y-1.5">
            <span className="font-medium text-foreground">Daily Focus Target (Minutes)</span>
            <Input type="number" defaultValue="120" />
          </div>
          <div className="pt-2">
            <Switch
              checked={true}
              onCheckedChange={() => {}}
              label="Enable session end notifications"
            />
          </div>
        </div>
      </Modal>
    </AppShell>
  );
};
