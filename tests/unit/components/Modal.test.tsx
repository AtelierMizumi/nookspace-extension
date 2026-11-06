import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Modal } from '@/components/ui/Modal';

describe('Modal Dialog Component', () => {
  it('renders nothing when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Preferences">
        <div>Content</div>
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders title, content and footer when isOpen is true', () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Preferences"
        description="Settings details"
        footer={<button>Save</button>}
      >
        <p>Modal body content</p>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('Modal body content')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('calls onClose when close icon button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Title">
        <div>Body</div>
      </Modal>
    );
    fireEvent.click(screen.getByRole('button', { name: /close dialog/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Title">
        <div>Body</div>
      </Modal>
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
