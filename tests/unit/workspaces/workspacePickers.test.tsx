import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  WorkspaceIconPicker,
  getWorkspaceIcon,
  WORKSPACE_ICONS,
} from '../../../src/features/workspaces/components/WorkspaceIconPicker';
import {
  WorkspaceColorPicker,
  WORKSPACE_COLORS,
} from '../../../src/features/workspaces/components/WorkspaceColorPicker';

describe('WorkspacePickers Suite — Milestone 8.2', () => {
  describe('WorkspaceIconPicker', () => {
    it('1. renders all 18 curated icons and highlights selected icon', () => {
      const onChange = vi.fn();
      render(<WorkspaceIconPicker value="Briefcase" onChange={onChange} />);

      expect(Object.keys(WORKSPACE_ICONS)).toHaveLength(18);

      const briefcaseBtn = screen.getByRole('radio', { name: 'Briefcase' });
      expect(briefcaseBtn).toHaveAttribute('aria-checked', 'true');

      const homeBtn = screen.getByRole('radio', { name: 'Home' });
      expect(homeBtn).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(homeBtn);
      expect(onChange).toHaveBeenCalledWith('Home');
    });

    it('2. getWorkspaceIcon returns correct component or fallback for unknown icons', () => {
      const Known = getWorkspaceIcon('GraduationCap');
      expect(Known).toBeDefined();

      const Fallback = getWorkspaceIcon('NonExistentIconXYZ');
      const Default = getWorkspaceIcon('LayoutGrid');
      expect(Fallback).toBe(Default);

      const UndefinedFallback = getWorkspaceIcon(undefined);
      expect(UndefinedFallback).toBe(Default);
    });
  });

  describe('WorkspaceColorPicker', () => {
    it('3. renders all 10 curated color swatches plus default/clear option', () => {
      const onChange = vi.fn();
      render(<WorkspaceColorPicker value="#6366f1" onChange={onChange} />);

      expect(WORKSPACE_COLORS).toHaveLength(10);

      // Default option
      const defaultBtn = screen.getByRole('radio', { name: 'Default color' });
      expect(defaultBtn).toBeInTheDocument();
      expect(defaultBtn).toHaveAttribute('aria-checked', 'false');

      // Selected Indigo swatch
      const indigoBtn = screen.getByRole('radio', { name: 'Indigo' });
      expect(indigoBtn).toHaveAttribute('aria-checked', 'true');

      // Select Emerald swatch
      const emeraldBtn = screen.getByRole('radio', { name: 'Emerald' });
      fireEvent.click(emeraldBtn);
      expect(onChange).toHaveBeenCalledWith('#10b981');

      // Click clear/default
      fireEvent.click(defaultBtn);
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('4. displays default option as checked when value is null or undefined', () => {
      const onChange = vi.fn();
      render(<WorkspaceColorPicker value={null} onChange={onChange} />);

      const defaultBtn = screen.getByRole('radio', { name: 'Default color' });
      expect(defaultBtn).toHaveAttribute('aria-checked', 'true');
    });
  });
});
