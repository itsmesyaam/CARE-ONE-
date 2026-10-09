import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DoctorToday } from '../../src/features/doctor/DoctorToday';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  queryClient.setQueryData(['doctor-today-appointments'], [
    {
      id: 'appt-1',
      appointment_date: '2026-10-08T09:30:00Z',
      status: 'booked',
      notes: 'Follow-up for diabetes and blood pressure',
      patient: {
        id: 'p-1',
        full_name: 'Arun Kumar',
        dob: '1978-01-01',
        gender: 'male',
        uhid: 'ABC-1001',
        phone: '9847000001',
      },
    },
    {
      id: 'appt-2',
      appointment_date: '2026-10-08T10:30:00Z',
      status: 'booked',
      notes: 'Routine checkup',
      patient: {
        id: 'p-2',
        full_name: 'Faisal Rahman',
        dob: '1974-01-01',
        gender: 'male',
        uhid: 'ABC-1005',
        phone: '9847000005',
      },
    },
  ]);

  queryClient.setQueryData(['patient-allergies-arun'], [
    {
      patient_id: 'p-1',
      substance: 'Penicillin',
      reaction: 'Rash',
      severity: 'moderate',
    },
  ]);

  queryClient.setQueryData(['doctor-pending-reports'], [
    { id: 'doc-1', title: 'HbA1c & Lipid Panel', patient_id: 'p-1' },
  ]);

  queryClient.setQueryData(['doctor-pending-symptoms'], [
    { id: 'sym-1', description: 'Occasional dizziness in the morning', severity: 'mild' },
  ]);

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Doctor Portal Feature: DoctorToday Screen', () => {
  it('renders greeting, date, and OPD room clinic summary', () => {
    renderWithClient(<DoctorToday />);

    expect(screen.getByRole('heading', { level: 1, name: /Dr\. Rahul/i })).toBeInTheDocument();
    expect(screen.getByText(/Morning OP in OPD 4/i)).toBeInTheDocument();
  });

  it('renders next patient ticket with stub, circular cutouts, patient name, and reason', () => {
    renderWithClient(<DoctorToday />);

    expect(screen.getByText(/Next patient/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Arun Kumar/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Follow-up for diabetes and blood pressure/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /Open chart/i })).toBeInTheDocument();
  });

  it('displays allergy warning badge when patient has recorded allergies', () => {
    renderWithClient(<DoctorToday />);

    expect(screen.getByText(/Allergic to penicillin/i)).toBeInTheDocument();
  });

  it("renders today's clinic schedule list with appointment items", () => {
    renderWithClient(<DoctorToday />);

    expect(screen.getByRole('heading', { level: 2, name: /Today's clinic/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Faisal Rahman/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders waiting queue section for reports and symptoms', () => {
    renderWithClient(<DoctorToday />);

    expect(screen.getByRole('heading', { level: 2, name: /Waiting for you/i })).toBeInTheDocument();
    expect(screen.getByText(/report to review/i)).toBeInTheDocument();
    expect(screen.getByText(/symptom reported/i)).toBeInTheDocument();
  });
});
