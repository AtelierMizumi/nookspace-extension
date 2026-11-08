import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { WidgetDefinition, WidgetProps, WidgetSettingsProps } from '../features/widget-system/types';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useTranslation } from '../services/i18n';

interface GreetingConfig {
  customName?: string;
}

export const GreetingWidgetComponent: React.FC<WidgetProps<GreetingConfig>> = ({ config }) => {
  const { t } = useTranslation();
  const [hour, setHour] = useState<number>(() => new Date().getHours());
  const displayName = config?.customName || 'Architect';

  useEffect(() => {
    setHour(new Date().getHours());
  }, []);

  const greeting =
    hour >= 5 && hour < 12
      ? t('widgets.greeting.morning')
      : hour >= 12 && hour < 18
      ? t('widgets.greeting.afternoon')
      : hour >= 18 && hour < 22
      ? t('widgets.greeting.evening')
      : t('widgets.greeting.night');

  return (
    <div className="h-full flex flex-col justify-between select-none">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span>Focus Zone</span>
      </div>

      <div className="my-auto py-2">
        <h3 className="text-xl font-medium tracking-tight text-foreground">
          {greeting}, <span className="font-semibold text-primary">{displayName}</span>
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {t('widgets.greeting.tagline')}
        </p>
      </div>

      <div className="text-[10px] text-muted-foreground/80">
        NookSpace Daily Flow
      </div>
    </div>
  );
};

export const GreetingWidgetSettings: React.FC<WidgetSettingsProps<GreetingConfig>> = ({
  config,
  onSaveConfig,
  onClose,
}) => {
  const [customName, setCustomName] = useState(config?.customName || 'Architect');

  const handleSave = () => {
    onSaveConfig({ customName: customName.trim() || 'Explorer' });
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="space-y-1.5">
        <label className="font-medium text-foreground">Display Name</label>
        <Input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Your name..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave}>
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export const GreetingWidget: WidgetDefinition<GreetingConfig> = {
  type: 'greeting',
  name: 'Personal Greeting',
  description: 'Warm time-based greeting card with your preferred name.',
  category: 'personal',
  icon: Sparkles,
  defaultConfig: { customName: 'Architect' },
  defaultDimensions: { w: 4, h: 2 },
  minDimensions: { w: 3, h: 2 },
  component: GreetingWidgetComponent,
  settingsComponent: GreetingWidgetSettings,
};
