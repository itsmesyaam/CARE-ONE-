import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PatientProvider } from '../../src/features/patient/PatientContext';
import { ReadingSheetModal } from '../../src/features/patient/ReadingSheetModal';

describe('Patient Feature: Screen 3 - Log a Reading Sheet Modal', () => {
  it('renders ReadingSheetModal with metric tabs, inputs, and guidance', () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <PatientProvider initialStep="app">
          <ReadingSheetModal onClose={handleClose} />
        </PatientProvider>
      </MemoryRouter>
    );

    // Title and close button
    expect(screen.getByRole('dialog', { name: /Log reading|Log a reading/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Close/i)).toBeInTheDocument();

    // Metric selector options
    expect(screen.getByRole('radio', { name: /Blood pressure/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Blood sugar/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Weight/i })).toBeInTheDocument();

    // Default BP inputs
    expect(screen.getByLabelText(/Upper \(systolic\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Lower \(diastolic\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Pulse \(optional\)/i)).toBeInTheDocument();

    // Guidance tip
    expect(screen.getByText(/Sit and rest for 5 minutes before you measure/i)).toBeInTheDocument();

    // Timing selector
    expect(screen.getByRole('radio', { name: /Now/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Earlier today/i })).toBeInTheDocument();

    // Save button (initially disabled until valid numbers entered)
    const saveBtn = screen.getByRole('button', { name: /Save reading/i });
    expect(saveBtn).toBeDisabled();
  });

  it('switches between metrics to display Sugar and Weight inputs', () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <PatientProvider initialStep="app">
          <ReadingSheetModal onClose={handleClose} />
        </PatientProvider>
      </MemoryRouter>
    );

    // Switch to Blood Sugar
    const sugarRadio = screen.getByRole('radio', { name: /Blood sugar/i });
    fireEvent.click(sugarRadio);

    expect(screen.getByLabelText(/Sugar level/i)).toBeInTheDocument();
    expect(screen.getByText('mg/dL')).toBeInTheDocument();
    expect(screen.getByText(/When was it taken\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fasting/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2 hrs after food/i })).toBeInTheDocument();

    // Switch to Weight
    const weightRadio = screen.getByRole('radio', { name: /Weight/i });
    fireEvent.click(weightRadio);

    expect(screen.getByRole('spinbutton', { name: /^Weight/i })).toBeInTheDocument();
    expect(screen.getByText('kg')).toBeInTheDocument();
  });

  it('validates plausibility and shows error for invalid numbers', () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <PatientProvider initialStep="app">
          <ReadingSheetModal onClose={handleClose} />
        </PatientProvider>
      </MemoryRouter>
    );

    const sysInput = screen.getByLabelText(/Upper \(systolic\)/i);
    const diaInput = screen.getByLabelText(/Lower \(diastolic\)/i);

    // Enter systolic lower than diastolic (invalid)
    fireEvent.change(sysInput, { target: { value: '80' } });
    fireEvent.change(diaInput, { target: { value: '120' } });

    expect(screen.getByRole('alert')).toHaveTextContent(/Check this number. It looks unusual for this reading./i);
    expect(screen.getByRole('button', { name: /Save reading/i })).toBeDisabled();
  });

  it('shows elevated target warning when reading exceeds prescribed goal', () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <PatientProvider initialStep="app">
          <ReadingSheetModal onClose={handleClose} />
        </PatientProvider>
      </MemoryRouter>
    );

    const sysInput = screen.getByLabelText(/Upper \(systolic\)/i);
    const diaInput = screen.getByLabelText(/Lower \(diastolic\)/i);

    // Enter high BP (150/95)
    fireEvent.change(sysInput, { target: { value: '150' } });
    fireEvent.change(diaInput, { target: { value: '95' } });

    expect(screen.getByRole('status')).toHaveTextContent(/outside the target/i);
    const saveBtn = screen.getByRole('button', { name: /Save reading/i });
    expect(saveBtn).not.toBeDisabled();
  });

  it('displays time input when Earlier today is selected', () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <PatientProvider initialStep="app">
          <ReadingSheetModal onClose={handleClose} />
        </PatientProvider>
      </MemoryRouter>
    );

    const earlierRadio = screen.getByRole('radio', { name: /Earlier today/i });
    fireEvent.click(earlierRadio);

    expect(screen.getByLabelText(/Time taken/i)).toBeInTheDocument();
  });

  it('submits valid reading and closes modal', () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <PatientProvider initialStep="app">
          <ReadingSheetModal onClose={handleClose} />
        </PatientProvider>
      </MemoryRouter>
    );

    const sysInput = screen.getByLabelText(/Upper \(systolic\)/i);
    const diaInput = screen.getByLabelText(/Lower \(diastolic\)/i);

    fireEvent.change(sysInput, { target: { value: '120' } });
    fireEvent.change(diaInput, { target: { value: '80' } });

    const saveBtn = screen.getByRole('button', { name: /Save reading/i });
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    expect(handleClose).toHaveBeenCalled();
  });
});
