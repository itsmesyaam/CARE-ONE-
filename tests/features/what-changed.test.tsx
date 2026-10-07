import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WhatChangedPanel } from '../../src/features/doctor/WhatChangedPanel';
import type { WhatChangedItem } from '../../src/features/doctor/types';

describe('Doctor Feature: What Changed Panel', () => {
  const mockItems: WhatChangedItem[] = [
    {
      happened_at: '2026-10-06T10:30:00Z',
      kind: 'report',
      summary: 'New report: Lipid Profile',
      ref_table: 'documents',
      ref_id: 'doc-uuid-1',
    },
    {
      happened_at: '2026-10-06T09:00:00Z',
      kind: 'reading',
      summary: 'Blood Pressure 145/95 mmHg (outside range)',
      ref_table: 'observations',
      ref_id: 'obs-uuid-1',
    },
    {
      happened_at: '2026-10-05T14:00:00Z',
      kind: 'medicine',
      summary: 'Active: Amlodipine 5mg',
      ref_table: 'medications',
      ref_id: 'med-uuid-1',
    },
    {
      happened_at: '2026-10-04T08:00:00Z',
      kind: 'missed',
      summary: 'Missed: Fasting Blood Sugar',
      ref_table: 'care_plan_items',
      ref_id: 'cpi-uuid-1',
    },
    {
      happened_at: '2026-10-03T16:20:00Z',
      kind: 'symptom',
      summary: 'Patient reported: Dizziness in mornings',
      ref_table: 'symptom_reports',
      ref_id: 'sym-uuid-1',
    },
  ];

  it('renders list of changes with badges and summaries', () => {
    const onSelectRecord = vi.fn();

    render(
      <WhatChangedPanel
        items={mockItems}
        isLoading={false}
        lastVisitDate="2026-10-01"
        onSelectRecord={onSelectRecord}
      />
    );

    expect(screen.getByText('New report: Lipid Profile')).toBeInTheDocument();
    expect(screen.getByText('Blood Pressure 145/95 mmHg (outside range)')).toBeInTheDocument();
    expect(screen.getByText('Active: Amlodipine 5mg')).toBeInTheDocument();
    expect(screen.getByText('Missed: Fasting Blood Sugar')).toBeInTheDocument();
    expect(screen.getByText('Patient reported: Dizziness in mornings')).toBeInTheDocument();
  });

  it('calls onSelectRecord when a change line is clicked', () => {
    const onSelectRecord = vi.fn();

    render(
      <WhatChangedPanel
        items={mockItems}
        isLoading={false}
        lastVisitDate="2026-10-01"
        onSelectRecord={onSelectRecord}
      />
    );

    const reportItem = screen.getByText('New report: Lipid Profile');
    fireEvent.click(reportItem);

    expect(onSelectRecord).toHaveBeenCalledTimes(1);
    expect(onSelectRecord).toHaveBeenCalledWith(mockItems[0]);
  });

  it('renders empty state when items list is empty and lastVisitDate is provided', () => {
    render(
      <WhatChangedPanel
        items={[]}
        isLoading={false}
        lastVisitDate="2026-10-01"
        onSelectRecord={vi.fn()}
      />
    );

    expect(screen.getByText(/Nothing new since 01 Oct 2026/i)).toBeInTheDocument();
  });

  it('renders fallback empty state when there are no items and no previous visits', () => {
    render(
      <WhatChangedPanel
        items={[]}
        isLoading={false}
        lastVisitDate={null}
        onSelectRecord={vi.fn()}
      />
    );

    expect(screen.getByText(/No previous visits/i)).toBeInTheDocument();
  });

  it('renders loading state when isLoading is true', () => {
    render(
      <WhatChangedPanel items={[]} isLoading={true} lastVisitDate={null} onSelectRecord={vi.fn()} />
    );

    expect(screen.getByText(/Loading changes since last visit/i)).toBeInTheDocument();
  });
});
