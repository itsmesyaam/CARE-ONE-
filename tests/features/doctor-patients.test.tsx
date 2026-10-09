import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DoctorPatients } from '../../src/features/doctor/DoctorPatients';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  queryClient.setQueryData(
    ['doctor', 'patients', 'all'],
    [
      {
        id: 'p-1',
        full_name: 'Arun Kumar',
        dob: '1978-01-01',
        gender: 'male',
        blood_group: 'B+',
        phone: '9847000001',
        uhid: 'ABC-1001',
        created_at: '2026-01-01',
      },
      {
        id: 'p-2',
        full_name: 'Faisal Rahman',
        dob: '1974-01-01',
        gender: 'male',
        blood_group: 'AB+',
        phone: '9847000005',
        uhid: 'ABC-1005',
        created_at: '2026-01-01',
      },
      {
        id: 'p-99',
        full_name: 'Harikrishnan Nair',
        dob: '1965-01-01',
        gender: 'male',
        blood_group: 'A+',
        phone: '9847000099',
        uhid: 'ABC-1099',
        created_at: '2026-01-01',
      },
    ]
  );

  queryClient.setQueryData(
    ['doctor', 'patients', 'care_team'],
    [
      { patient_id: 'p-1', expires_at: '2027-01-01' },
      { patient_id: 'p-2', expires_at: '2027-01-01' },
    ]
  );

  queryClient.setQueryData(['doctor', 'patients', 'emergency_access'], []);

  queryClient.setQueryData(
    ['doctor', 'patients', 'conditions'],
    [{ patient_id: 'p-1', name: 'Type 2 Diabetes Mellitus', status: 'active' }]
  );

  queryClient.setQueryData(['doctor', 'patients', 'pending_docs'], []);
  queryClient.setQueryData(['doctor', 'patients', 'pending_symptoms'], []);
  queryClient.setQueryData(['doctor', 'patients', 'encounters'], []);
  queryClient.setQueryData(['doctor', 'patients', 'appointments'], []);

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Doctor Portal Feature: DoctorPatients Directory & Emergency Access', () => {
  it('renders directory heading, search input, and filter chips', () => {
    renderWithClient(<DoctorPatients />);

    expect(screen.getByRole('heading', { level: 1, name: /Patients/i })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Search by name, phone or hospital number/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^All/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Needs review/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Overdue/i })).toBeInTheDocument();
  });

  it('renders care team patient cards with conditions, next visits, and signals', () => {
    renderWithClient(<DoctorPatients />);

    expect(screen.getByText(/Arun Kumar/i)).toBeInTheDocument();
    expect(screen.getByText(/Faisal Rahman/i)).toBeInTheDocument();
    expect(screen.getByText(/Type 2 Diabetes Mellitus/i)).toBeInTheDocument();
  });

  it('filters patient list when typing in search box', () => {
    renderWithClient(<DoctorPatients />);

    const searchInput = screen.getByPlaceholderText(/Search by name, phone or hospital number/i);
    fireEvent.change(searchInput, { target: { value: 'Arun' } });

    expect(screen.getByText(/Arun Kumar/i)).toBeInTheDocument();
    expect(screen.queryByText(/Faisal Rahman/i)).not.toBeInTheDocument();
  });

  it('displays other hospital patients and opens emergency access break-glass modal', () => {
    renderWithClient(<DoctorPatients />);

    const searchInput = screen.getByPlaceholderText(/Search by name, phone or hospital number/i);
    fireEvent.change(searchInput, { target: { value: 'Harikrishnan' } });

    expect(screen.getByText(/Other patients at ABC Hospital/i)).toBeInTheDocument();
    expect(screen.getByText(/Harikrishnan Nair/i)).toBeInTheDocument();

    const emergencyBtn = screen.getByRole('button', { name: /Emergency access/i });
    expect(emergencyBtn).toBeInTheDocument();

    fireEvent.click(emergencyBtn);
    expect(
      screen.getByRole('heading', { level: 2, name: /Emergency access/i })
    ).toBeInTheDocument();
  });
});
