import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DoctorPatients } from '../../src/features/doctor/DoctorPatients';

describe('Doctor Portal Feature: DoctorPatients Directory & Emergency Access', () => {
  it('renders directory heading, search input, and filter chips', () => {
    render(
      <MemoryRouter>
        <DoctorPatients />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Patients/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by name, phone or hospital number/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^All/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Needs review/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Overdue follow-up/i })).toBeInTheDocument();
  });

  it('renders care team patient cards with conditions, next visits, and signals', () => {
    render(
      <MemoryRouter>
        <DoctorPatients />
      </MemoryRouter>
    );

    expect(screen.getByText(/Anjali Menon/i)).toBeInTheDocument();
    expect(screen.getByText(/Vinod Kumar/i)).toBeInTheDocument();
    expect(screen.getByText(/Thankamma Varghese/i)).toBeInTheDocument();
  });

  it('filters patient list when typing in search box', () => {
    render(
      <MemoryRouter>
        <DoctorPatients />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Search by name, phone or hospital number/i);
    fireEvent.change(searchInput, { target: { value: 'Anjali' } });

    expect(screen.getByText(/Anjali Menon/i)).toBeInTheDocument();
    expect(screen.queryByText(/Vinod Kumar/i)).not.toBeInTheDocument();
  });

  it('displays other hospital patients and opens emergency access break-glass modal', () => {
    render(
      <MemoryRouter>
        <DoctorPatients />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Search by name, phone or hospital number/i);
    fireEvent.change(searchInput, { target: { value: 'Harikrishnan' } });

    expect(screen.getByText(/Other patients at ABC Hospital/i)).toBeInTheDocument();
    expect(screen.getByText(/Harikrishnan Nair/i)).toBeInTheDocument();

    const emergencyBtn = screen.getByRole('button', { name: /Emergency access/i });
    expect(emergencyBtn).toBeInTheDocument();
    fireEvent.click(emergencyBtn);

    expect(screen.getByRole('heading', { level: 2, name: /Emergency access/i })).toBeInTheDocument();
    expect(screen.getByText(/Access ends at/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/I understand this access is logged and reviewed/i)).toBeInTheDocument();
  });
});
