import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface Props {
  widgetType: string;
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[WidgetErrorBoundary] Error caught in widget "${this.props.widgetType}":`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex flex-col justify-between text-xs">
          <div>
            <div className="flex items-center gap-2 text-destructive font-semibold mb-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Widget Error ({this.props.widgetType})</span>
            </div>
            <p className="text-muted-foreground text-[11px] line-clamp-3">
              {this.state.error?.message || 'An unexpected rendering error occurred in this widget.'}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-destructive/20 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={this.handleRetry}
              leftIcon={<RefreshCw className="h-3 w-3" />}
              className="text-xs h-7"
            >
              Reload Widget
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
