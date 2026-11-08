import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SharedWorkspaceModal } from '../../../src/features/shared-workspace/components/SharedWorkspaceModal';
import { VirtualStudyRoomModal } from '../../../src/features/shared-workspace/components/VirtualStudyRoomModal';
import { useSharedWorkspaceStore } from '../../../src/features/shared-workspace/stores/sharedWorkspaceStore';
import { useAuthStore } from '../../../src/features/account/stores/authStore';

describe('Shared Workspace & Study Room Components', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      user: { id: 'u-1', email: 'tester@nook.space' } as any,
    });
    useSharedWorkspaceStore.setState({
      workspaces: [],
      activeSharedWorkspace: null,
      members: [],
      presenceList: [],
      isLoading: false,
      error: null,
      isModalOpen: true,
      isStudyRoomOpen: false,
    });
  });

  it('renders SharedWorkspaceModal with navigation tabs', () => {
    render(<SharedWorkspaceModal />);

    const titles = screen.getAllByText(/shared workspaces/i);
    expect(titles.length).toBeGreaterThan(0);

    const createTabBtn = screen.getAllByText(/create room/i)[0];
    expect(createTabBtn).toBeInTheDocument();

    const joinTabBtn = screen.getAllByText(/join room/i)[0];
    expect(joinTabBtn).toBeInTheDocument();
  });

  it('switches to Create Room tab and accepts room name', () => {
    render(<SharedWorkspaceModal />);

    const createTabBtn = screen.getAllByText(/create room/i)[0];
    fireEvent.click(createTabBtn);

    const nameInput = screen.getByPlaceholderText(/study squad/i);
    expect(nameInput).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: 'My Test Team' } });
    expect((nameInput as HTMLInputElement).value).toBe('My Test Team');
  });

  it('renders VirtualStudyRoomModal when isStudyRoomOpen is true', () => {
    useSharedWorkspaceStore.setState({
      isModalOpen: false,
      isStudyRoomOpen: true,
      activeSharedWorkspace: {
        id: 'ws-active-1',
        name: 'Math Exam Prep',
        description: null,
        icon: 'BookOpen',
        color: '#10b981',
        joinCode: 'MATH99',
        ownerId: 'u-1',
        createdAt: '2026-11-08T00:00:00Z',
        updatedAt: '2026-11-08T00:00:00Z',
      },
      presenceList: [
        {
          id: 'pres-1',
          workspaceId: 'ws-active-1',
          userId: 'u-1',
          status: 'focus',
          activityTitle: 'Calculus Ch. 3',
          focusMinutesToday: 60,
          lastSeenAt: '2026-11-08T00:00:00Z',
          profile: {
            id: 'u-1',
            email: 'tester@nook.space',
            displayName: 'Lead Math',
            avatarUrl: null,
            bio: null,
            language: 'vi',
            theme: 'dark',
            createdAt: '2026-11-08T00:00:00Z',
            updatedAt: '2026-11-08T00:00:00Z',
          },
        },
      ],
    });

    render(<VirtualStudyRoomModal />);

    expect(screen.getByText('Math Exam Prep')).toBeInTheDocument();
    expect(screen.getByText('MATH99', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Lead Math')).toBeInTheDocument();
    expect(screen.getByText(/calculus ch\. 3/i)).toBeInTheDocument();
  });
});
