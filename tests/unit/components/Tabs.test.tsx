import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

describe('Tabs Component', () => {
  it('renders default active tab and displays its content', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab One</TabsTrigger>
          <TabsTrigger value="tab2">Tab Two</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content One</TabsContent>
        <TabsContent value="tab2">Content Two</TabsContent>
      </Tabs>
    );

    expect(screen.getByText('Content One')).toBeInTheDocument();
    expect(screen.queryByText('Content Two')).not.toBeInTheDocument();
  });

  it('switches content when another tab trigger is clicked', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab One</TabsTrigger>
          <TabsTrigger value="tab2">Tab Two</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content One</TabsContent>
        <TabsContent value="tab2">Content Two</TabsContent>
      </Tabs>
    );

    fireEvent.click(screen.getByRole('tab', { name: /tab two/i }));
    expect(screen.queryByText('Content One')).not.toBeInTheDocument();
    expect(screen.getByText('Content Two')).toBeInTheDocument();
  });
});
