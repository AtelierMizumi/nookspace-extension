import { describe, it, expect } from 'vitest';
import {
  WorkspaceSchema,
  CreateWorkspaceInputSchema,
  UpdateWorkspaceInputSchema,
  WorkspaceColorSchema,
  WorkspaceEntity,
} from '../../../src/types/workspaces';

describe('Workspace Schema & Zod Validation Suite — Milestone 8.1', () => {
  const validWorkspace: WorkspaceEntity = {
    id: 'ws-test-01',
    name: 'Personal Focus',
    icon: 'Sparkles',
    color: '#6366f1',
    isDefault: true,
    order: 0,
    createdAt: 1000,
    updatedAt: 1000,
  };

  // ==========================================
  // 1. WORKSPACE ENTITY SCHEMA
  // ==========================================
  describe('WorkspaceSchema', () => {
    it('validates a complete valid workspace entity', () => {
      const result = WorkspaceSchema.safeParse(validWorkspace);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Personal Focus');
        expect(result.data.isDefault).toBe(true);
      }
    });

    it('validates workspace without optional color', () => {
      const { color, ...withoutColor } = validWorkspace;
      const result = WorkspaceSchema.safeParse(withoutColor);
      expect(result.success).toBe(true);
    });

    it('rejects empty or whitespace-only name', () => {
      expect(WorkspaceSchema.safeParse({ ...validWorkspace, name: '' }).success).toBe(false);
      expect(WorkspaceSchema.safeParse({ ...validWorkspace, name: '    ' }).success).toBe(false);
    });

    it('rejects name exceeding 50 characters', () => {
      const longName = 'a'.repeat(51);
      const result = WorkspaceSchema.safeParse({ ...validWorkspace, name: longName });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('50 characters');
      }
    });

    it('trims leading and trailing whitespace from name', () => {
      const result = WorkspaceSchema.safeParse({
        ...validWorkspace,
        name: '  Cleaned Workspace Name  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Cleaned Workspace Name');
      }
    });

    it('rejects negative order or non-integer order', () => {
      expect(WorkspaceSchema.safeParse({ ...validWorkspace, order: -1 }).success).toBe(false);
      expect(WorkspaceSchema.safeParse({ ...validWorkspace, order: 1.5 }).success).toBe(false);
    });

    it('rejects non-boolean isDefault', () => {
      expect(WorkspaceSchema.safeParse({ ...validWorkspace, isDefault: 'true' as any }).success).toBe(false);
    });

    it('rejects empty id', () => {
      expect(WorkspaceSchema.safeParse({ ...validWorkspace, id: '' }).success).toBe(false);
    });
  });

  // ==========================================
  // 2. WORKSPACE COLOR SCHEMA
  // ==========================================
  describe('WorkspaceColorSchema', () => {
    it('accepts valid 3-character and 6-character hex colors', () => {
      expect(WorkspaceColorSchema.safeParse('#fff').success).toBe(true);
      expect(WorkspaceColorSchema.safeParse('#6366f1').success).toBe(true);
      expect(WorkspaceColorSchema.safeParse('#10B981').success).toBe(true);
      expect(WorkspaceColorSchema.safeParse('#000000').success).toBe(true);
    });

    it('rejects invalid hex colors', () => {
      expect(WorkspaceColorSchema.safeParse('red').success).toBe(false);
      expect(WorkspaceColorSchema.safeParse('#12345').success).toBe(false);
      expect(WorkspaceColorSchema.safeParse('#1234567').success).toBe(false);
      expect(WorkspaceColorSchema.safeParse('6366f1').success).toBe(false);
      expect(WorkspaceColorSchema.safeParse('').success).toBe(false);
    });
  });

  // ==========================================
  // 3. CREATE WORKSPACE INPUT SCHEMA
  // ==========================================
  describe('CreateWorkspaceInputSchema', () => {
    it('validates minimal creation input with default icon', () => {
      const result = CreateWorkspaceInputSchema.safeParse({
        name: 'Deep Work Studio',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Deep Work Studio');
        expect(result.data.icon).toBe('LayoutGrid');
      }
    });

    it('validates full creation input with custom icon and color', () => {
      const result = CreateWorkspaceInputSchema.safeParse({
        name: 'Developer Space',
        icon: 'Code',
        color: '#8b5cf6',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.icon).toBe('Code');
        expect(result.data.color).toBe('#8b5cf6');
      }
    });

    it('rejects create input with unknown/immutable fields (strict)', () => {
      const result = CreateWorkspaceInputSchema.safeParse({
        name: 'Hacked Workspace',
        id: 'forbidden-custom-id',
        isDefault: true,
      });
      expect(result.success).toBe(false);
    });

    it('rejects create input with empty or whitespace-only name', () => {
      expect(CreateWorkspaceInputSchema.safeParse({ name: '' }).success).toBe(false);
      expect(CreateWorkspaceInputSchema.safeParse({ name: '   ' }).success).toBe(false);
    });
  });

  // ==========================================
  // 4. UPDATE WORKSPACE INPUT SCHEMA
  // ==========================================
  describe('UpdateWorkspaceInputSchema', () => {
    it('validates partial update of name', () => {
      const result = UpdateWorkspaceInputSchema.safeParse({
        name: 'Renamed Space',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Renamed Space');
      }
    });

    it('validates partial update of icon and color', () => {
      const result = UpdateWorkspaceInputSchema.safeParse({
        icon: 'BookOpen',
        color: '#10b981',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.icon).toBe('BookOpen');
        expect(result.data.color).toBe('#10b981');
      }
    });

    it('allows clearing color by passing null', () => {
      const result = UpdateWorkspaceInputSchema.safeParse({
        color: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.color).toBeNull();
      }
    });

    it('validates partial update of order', () => {
      const result = UpdateWorkspaceInputSchema.safeParse({
        order: 5,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe(5);
      }
    });

    it('rejects empty name in update', () => {
      expect(UpdateWorkspaceInputSchema.safeParse({ name: '' }).success).toBe(false);
      expect(UpdateWorkspaceInputSchema.safeParse({ name: '   ' }).success).toBe(false);
    });

    it('rejects immutable fields in update (strict rejection of id, createdAt, isDefault)', () => {
      expect(UpdateWorkspaceInputSchema.safeParse({ id: 'new-id' }).success).toBe(false);
      expect(UpdateWorkspaceInputSchema.safeParse({ isDefault: true }).success).toBe(false);
      expect(UpdateWorkspaceInputSchema.safeParse({ createdAt: 99999 }).success).toBe(false);
    });
  });
});
