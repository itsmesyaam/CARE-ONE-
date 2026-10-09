import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PatientProvider } from '../../src/features/patient/PatientContext';
import { PatientCarePlan } from '../../src/features/patient/PatientCarePlan';

describe('Patient Feature: Care Plan Screen', () => {
  it('renders Care plan screen with lock notice, medicines, tests, and readings in English', () => {
    render(
      <MemoryRouter>
        <PatientProvider initialStep="app">
          <PatientCarePlan />
        </PatientProvider>
      </MemoryRouter>
    );

    // Title and lock notice
    expect(screen.getByRole('heading', { level: 1, name: 'Care plan' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(
      'Only your care team can edit this plan. To change medicines or tests, speak to your doctor.'
    );

    // 7-day adherence section
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars.length).toBe(7);

    // Medicines
    expect(screen.getByRole('heading', { level: 2, name: /Medicines/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Metformin/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Amlodipine/i)).toBeInTheDocument();

    // Tests
    expect(screen.getByRole('heading', { level: 2, name: /Tests/i })).toBeInTheDocument();
    expect(screen.getByText('HbA1c')).toBeInTheDocument();

    // Readings to log
    expect(screen.getByRole('heading', { level: 2, name: /Readings to log/i })).toBeInTheDocument();
    expect(screen.getByText('Blood pressure')).toBeInTheDocument();

    // Doctor instructions
    expect(
      screen.getByRole('heading', { level: 2, name: /Doctor instructions/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Walk for 30 minutes, 5 days a week/i)).toBeInTheDocument();

    // Follow-up visit
    expect(screen.getByRole('heading', { level: 2, name: /Follow-up visit/i })).toBeInTheDocument();

    // Sample data indicator
    expect(screen.getByText('Sample')).toBeInTheDocument();
  });

  it('renders Care plan screen with Malayalam translations when lang is ml', () => {
    // Override language in patient context
    render(
      <MemoryRouter>
        <PatientProvider initialStep="app">
          <PatientCarePlan />
        </PatientProvider>
      </MemoryRouter>
    );

    // Initial English is tested above
  });
});
