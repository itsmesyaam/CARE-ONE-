import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccessLogPage } from '../../src/features/admin/AccessLogPage';
import type { AuditLogEntry, StaffMember } from '../../src/features/admin/types';

describe('Admin Feature: Access Log Viewer', () => {
  const mockStaff: StaffMember[] = [
    {
      id: 's1',
      user_id: 'u1',
      full_name: 'Dr. Ramesh Kumar',
      role: 'doctor',
      department_id: 'd1',
      phone: '9847000001',
      is_active: true,
      created_at: new Date().toISOString(),
      deleted_at: null,
    },
  ];

  const mockLogs: AuditLogEntry[] = [
    {
      id: 1,
      at: '2026-10-06T11:00:00Z',
      actor_id: 'u1',
      actor_name: 'Dr. Ramesh Kumar',
      actor_role: 'doctor',
      action: 'VIEWED_CHART',
      table_name: 'patients',
      record_id: 'p1',
      patient_id: 'p1',
      reason: null,
    },
    {
      id: 2,
      at: '2026-10-06T12:30:00Z',
      actor_id: 'u1',
      actor_name: 'Dr. Ramesh Kumar',
      actor_role: 'doctor',
      action: 'EMERGENCY_ACCESS_GRANTED',
      table_name: 'emergency_access',
      record_id: 'ea1',
      patient_id: 'p2',
      reason: 'Acute chest pain emergency in casualty',
    },
    {
      id: 3,
      at: '2026-10-06T14:15:00Z',
      actor_id: 'u2',
      actor_name: 'Anjali Nair',
      actor_role: 'front_desk',
      action: 'INSERT',
      table_name: 'appointments',
      record_id: 'ap1',
      patient_id: 'p3',
      reason: null,
    },
  ];

  it('renders access logs showing Who, What, When, and Why without old/new payloads', () => {
    render(
      <AccessLogPage
        logs={mockLogs}
        staffList={mockStaff}
        isLoading={false}
        filter={{}}
        onFilterChange={vi.fn()}
      />
    );

    expect(screen.getAllByText('Dr. Ramesh Kumar').length).toBeGreaterThan(0);
    expect(screen.getByText('VIEWED_CHART')).toBeInTheDocument();
    expect(screen.getByText('EMERGENCY_ACCESS_GRANTED')).toBeInTheDocument();
    expect(screen.getByText('Acute chest pain emergency in casualty')).toBeInTheDocument();

    // Verify old_row or new_row are NEVER in the document
    expect(screen.queryByText(/old_row/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/new_row/i)).not.toBeInTheDocument();
  });

  it('highlights emergency access events clearly with a badge', () => {
    render(
      <AccessLogPage
        logs={mockLogs}
        staffList={mockStaff}
        isLoading={false}
        filter={{}}
        onFilterChange={vi.fn()}
      />
    );

    const emergencyBadge = screen.getByText('Emergency Access');
    expect(emergencyBadge).toBeInTheDocument();
  });

  it('handles filter changes for staff and action', () => {
    const onFilterChange = vi.fn();

    render(
      <AccessLogPage
        logs={mockLogs}
        staffList={mockStaff}
        isLoading={false}
        filter={{}}
        onFilterChange={onFilterChange}
      />
    );

    const actionInput = screen.getByPlaceholderText(/Filter action.../i);
    fireEvent.change(actionInput, { target: { value: 'EMERGENCY' } });

    expect(onFilterChange).toHaveBeenCalled();
  });
});
