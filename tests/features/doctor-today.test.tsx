import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DoctorToday } from '../../src/features/doctor/DoctorToday';

describe('Doctor Portal Feature: DoctorToday Screen', () => {
  it('renders greeting, date, and OPD room clinic summary', () => {
    render(
      <MemoryRouter>
        <DoctorToday />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Dr\. Rahul/i })).toBeInTheDocument();
    expect(screen.getByText(/Morning OP in OP Block B, Room 12/i)).toBeInTheDocument();
  });

  it('renders next patient ticket with stub, circular cutouts, patient name, and reason', () => {
    render(
      <MemoryRouter>
        <DoctorToday />
      </MemoryRouter>
    );

    expect(screen.getByText(/Next patient/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Anjali Menon/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Follow-up for diabetes and blood pressure/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /Open chart/i })).toBeInTheDocument();
  });

  it('displays allergy warning badge when patient has recorded allergies', () => {
    render(
      <MemoryRouter>
        <DoctorToday />
      </MemoryRouter>
    );

    expect(screen.getByText(/Allergic to penicillin/i)).toBeInTheDocument();
  });

  it("renders today's clinic schedule list with appointment items", () => {
    render(
      <MemoryRouter>
        <DoctorToday />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 2, name: /Today's clinic/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Vinod Kumar/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Thankamma Varghese/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders waiting queue section for reports and symptoms', () => {
    render(
      <MemoryRouter>
        <DoctorToday />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 2, name: /Waiting for you/i })).toBeInTheDocument();
    expect(screen.getByText(/Lab reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Reported symptoms/i)).toBeInTheDocument();
  });
});
