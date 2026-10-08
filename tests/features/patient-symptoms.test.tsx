import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PatientProvider } from '../../src/features/patient/PatientContext';
import { SymptomSheetModal } from '../../src/features/patient/SymptomSheetModal';

describe('Patient Feature: Screen 4 - Report a Symptom Sheet Modal', () => {
  it('renders SymptomSheetModal with emergency SOS callout, symptoms, and form controls', () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <PatientProvider initialStep="app">
          <SymptomSheetModal onClose={handleClose} />
        </PatientProvider>
      </MemoryRouter>
    );

    // Title and Close button
    expect(screen.getByRole('dialog', { name: /Tell us a symptom|Report a symptom/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Close/i)).toBeInTheDocument();

    // Emergency SOS callout and direct call links
    expect(screen.getByText(/This form isn't watched around the clock/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call 112/i })).toHaveAttribute('href', 'tel:112');
    expect(screen.getByRole('link', { name: /Call ABC casualty/i })).toHaveAttribute('href', 'tel:04840000112');

    // Symptom chips
    expect(screen.getByText(/What are you feeling\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dizziness/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Headache/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Breathlessness/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chest pain/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Swollen feet/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tiredness/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fever/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Something else/i })).toBeInTheDocument();

    // Textarea description
    expect(screen.getByLabelText(/Describe it in your own words/i)).toBeInTheDocument();

    // Onset chips
    expect(screen.getByText(/When did it start\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Today$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yesterday/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2 to 3 days ago/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Over a week/i })).toBeInTheDocument();

    // Severity selector
    expect(screen.getByRole('radio', { name: /Mild/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Moderate/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Severe/i })).toBeInTheDocument();

    // Submit button (initially disabled until selection or description is entered)
    const submitBtn = screen.getByRole('button', { name: /Send to my care team/i });
    expect(submitBtn).toBeDisabled();
  });

  it('selects symptoms and enables submission', () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <PatientProvider initialStep="app">
          <SymptomSheetModal onClose={handleClose} />
        </PatientProvider>
      </MemoryRouter>
    );

    const headacheChip = screen.getByRole('button', { name: /Headache/i });
    fireEvent.click(headacheChip);

    const submitBtn = screen.getByRole('button', { name: /Send to my care team/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it('triggers prominent red-flag warning on critical symptoms (chest pain, breathlessness, severe)', () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <PatientProvider initialStep="app">
          <SymptomSheetModal onClose={handleClose} />
        </PatientProvider>
      </MemoryRouter>
    );

    // No warning initially
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Select chest pain
    const chestChip = screen.getByRole('button', { name: /Chest pain/i });
    fireEvent.click(chestChip);

    // Warning appears
    expect(screen.getByRole('alert')).toHaveTextContent(
      /Chest pain, trouble breathing or severe symptoms can be an emergency. Call 112 or casualty now./i
    );
  });

  it('submits symptom report and closes sheet', () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <PatientProvider initialStep="app">
          <SymptomSheetModal onClose={handleClose} />
        </PatientProvider>
      </MemoryRouter>
    );

    const feverChip = screen.getByRole('button', { name: /Fever/i });
    fireEvent.click(feverChip);

    const descInput = screen.getByLabelText(/Describe it in your own words/i);
    fireEvent.change(descInput, { target: { value: 'Mild fever since morning.' } });

    const submitBtn = screen.getByRole('button', { name: /Send to my care team/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    expect(handleClose).toHaveBeenCalled();
  });
});
