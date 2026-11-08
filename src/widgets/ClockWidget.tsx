import React, { useState, useEffect } from 'react';
import { Clock as ClockIcon } from 'lucide-react';
import { WidgetDefinition, WidgetProps, WidgetSettingsProps } from '../features/widget-system/types';
import { Switch } from '../components/ui/Switch';
import { Button } from '../components/ui/Button';
import { useTranslation } from '../services/i18n';

interface ClockConfig {
  showSeconds?: boolean;
  format24h?: boolean;
}

export const ClockWidgetComponent: React.FC<WidgetProps<ClockConfig>> = ({ config }) => {
  const { formatDate, formatTime, t } = useTranslation();
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');

  const showSeconds = config?.showSeconds ?? true;
  const format24h = config?.format24h ?? false;

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        formatTime(now, {
          hour: '2-digit',
          minute: '2-digit',
          second: showSeconds ? '2-digit' : undefined,
          hour12: !format24h,
        })
      );
      setDate(
        formatDate(now, { weekday: 'short', month: 'short', day: 'numeric' })
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [showSeconds, format24h, formatDate, formatTime]);

  return (
    <div className="h-full flex flex-col justify-between select-none">
      <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
        <span className="flex items-center gap-1.5">
          <ClockIcon className="h-3.5 w-3.5 text-primary" />
          {t('widgets.clock.timeAndDate')}
        </span>
        <span className="text-[11px]">{date}</span>
      </div>

      <div className="my-auto py-2">
        <div className="text-3xl font-light tracking-tight font-mono text-foreground tabular-nums">
          {time || '00:00:00'}
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground/80 flex items-center justify-between">
        <span>{format24h ? t('widgets.clock.format24') : t('widgets.clock.format12')}</span>
        <span>{t('widgets.clock.localTime')}</span>
      </div>
    </div>
  );
};

export const ClockWidgetSettings: React.FC<WidgetSettingsProps<ClockConfig>> = ({
  config,
  onSaveConfig,
  onClose,
}) => {
  const { t } = useTranslation();
  const [showSeconds, setShowSeconds] = useState(config?.showSeconds ?? true);
  const [format24h, setFormat24h] = useState(config?.format24h ?? false);

  const handleSave = () => {
    onSaveConfig({ showSeconds, format24h });
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="space-y-3">
        <Switch
          checked={showSeconds}
          onCheckedChange={setShowSeconds}
          label={t('widgets.clock.displaySeconds')}
        />
        <Switch
          checked={format24h}
          onCheckedChange={setFormat24h}
          label={t('widgets.clock.use24h')}
        />
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave}>
          {t('common.saveSettings')}
        </Button>
      </div>
    </div>
  );
};

export const ClockWidget: WidgetDefinition<ClockConfig> = {
  type: 'clock',
  name: 'Digital Clock',
  description: 'Clean digital time display with date and format options.',
  category: 'utilities',
  icon: ClockIcon,
  defaultConfig: { showSeconds: true, format24h: false },
  defaultDimensions: { w: 4, h: 2 },
  minDimensions: { w: 3, h: 2 },
  component: ClockWidgetComponent,
  settingsComponent: ClockWidgetSettings,
};
