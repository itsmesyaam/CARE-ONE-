import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminOverviewPanel } from '../../src/features/admin/AdminOverviewPanel';
import type { AdminDashboardCounts } from '../../src/features/admin/types';

describe('Admin Feature: Dashboard Operational Metrics & Charts', () => {
  const mockCounts: AdminDashboardCounts = {
    today_appointments: 14,
    follow_ups_due: 6,
    reports_waiting_review: 9,
    patients_overdue_follow_up: 3,
    consultations_this_month: 128,
    active_patients_30d: 45,
    invited_patients: 60,
    active_patient_share: 75.0,
  };

  it('renders all 6 operational metric cards with accurate values', () => {
    render(<AdminOverviewPanel counts={mockCounts} isLoading={false} />);

    expect(screen.getByText("Today's Appointments")).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();

    expect(screen.getByText('Follow-ups Due Today')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();

    expect(screen.getByText('Reports Waiting Review')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();

    expect(screen.getByText('Overdue Follow-ups')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    expect(screen.getByText('Consultations This Month')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();

    expect(screen.getByText('Active App Patients')).toBeInTheDocument();
    expect(screen.getAllByText('75%').length).toBeGreaterThan(0);
    expect(screen.getByText(/45 of 60 invited/i)).toBeInTheDocument();
  });

  it('renders loading state when isLoading is true', () => {
    render(<AdminOverviewPanel counts={null} isLoading={true} />);

    expect(screen.getByText(/Loading dashboard metrics/i)).toBeInTheDocument();
  });
});
