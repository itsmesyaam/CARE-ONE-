import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PatientProvider } from '../../src/features/patient/PatientContext';
import { PatientRecords, ReportSheetModal, UploadSheetModal } from '../../src/features/patient/PatientRecords';

describe('Patient Feature: Records and Reports Screen', () => {
  it('renders Records screen with tabs, search input, filter chips, and reports list', () => {
    render(
      <MemoryRouter>
        <PatientProvider initialStep="app">
          <PatientRecords />
        </PatientProvider>
      </MemoryRouter>
    );

    // Title and Sample badge
    expect(screen.getByRole('heading', { level: 1, name: 'Records' })).toBeInTheDocument();
    expect(screen.getByText('Sample')).toBeInTheDocument();

    // Tabs
    expect(screen.getByRole('tab', { name: /Reports/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Readings/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Medicines/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Visit notes/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Health summary/i })).toBeInTheDocument();

    // Search and filter chips
    expect(screen.getByPlaceholderText(/Search reports/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reviewed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Waiting review' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'By you' })).toBeInTheDocument();

    // Report cards exist
    expect(screen.getByText('Lipid profile')).toBeInTheDocument();
    expect(screen.getByText('HbA1c and fasting glucose')).toBeInTheDocument();

    // DPDP / Indian server notice
    expect(screen.getByRole('note')).toHaveTextContent(
      'Encrypted and stored in India under DPDP rules. Only your treating doctor and clinical team can access.'
    );
  });

  it('filters reports when typing into search input', () => {
    render(
      <MemoryRouter>
        <PatientProvider initialStep="app">
          <PatientRecords />
        </PatientProvider>
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Search reports/i);
    fireEvent.change(searchInput, { target: { value: 'Lipid' } });

    expect(screen.getByText('Lipid profile')).toBeInTheDocument();
    expect(screen.queryByText('HbA1c and fasting glucose')).not.toBeInTheDocument();
  });

  it('switches between tabs: Readings, Medicines, Visits, Summary', () => {
    render(
      <MemoryRouter>
        <PatientProvider initialStep="app">
          <PatientRecords />
        </PatientProvider>
      </MemoryRouter>
    );

    // Switch to Readings
    fireEvent.click(screen.getByRole('tab', { name: /Readings/i }));
    expect(screen.getByRole('heading', { level: 2, name: /Blood pressure readings/i })).toBeInTheDocument();

    // Switch to Medicines
    fireEvent.click(screen.getByRole('tab', { name: /Medicines/i }));
    expect(screen.getByText(/Metformin/i)).toBeInTheDocument();

    // Switch to Visit notes
    fireEvent.click(screen.getByRole('tab', { name: /Visit notes/i }));
    expect(screen.getByText(/Follow-up for diabetes/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Dr. Rahul Nair/i).length).toBeGreaterThan(0);

    // Switch to Health summary
    fireEvent.click(screen.getByRole('tab', { name: /Health summary/i }));
    expect(screen.getByRole('heading', { level: 2, name: /Active conditions/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Allergies/i })).toBeInTheDocument();
  });

  it('renders ReportSheetModal with key values and closes when clicked', () => {
    let closed = false;
    render(
      <MemoryRouter>
        <PatientProvider initialStep="app">
          <ReportSheetModal id="r2" onClose={() => { closed = true; }} />
        </PatientProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('dialog', { name: 'HbA1c and fasting glucose' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Key values from report/i })).toBeInTheDocument();
    expect(screen.getByText('7.4')).toBeInTheDocument();
    expect(screen.getByText(/Dr. Rahul Nair/i)).toBeInTheDocument();

    // Close button
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(closed).toBe(true);
  });

  it('validates file upload in UploadSheetModal rejecting oversized files (>10MB)', () => {
    render(
      <MemoryRouter>
        <PatientProvider initialStep="app">
          <UploadSheetModal onClose={() => {}} />
        </PatientProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('dialog', { name: 'Upload a report' })).toBeInTheDocument();

    // Select file with size > 10MB
    const oversizedFile = new File(['x'.repeat(100)], 'huge.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(oversizedFile, 'size', { value: 11 * 1024 * 1024 });

    const fileInput = document.querySelector('input[type="file"][accept*="pdf"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    expect(screen.getByRole('alert')).toHaveTextContent('File size must be under 10 MB.');
  });

  it('supports Malayalam translations in PatientRecords', () => {
    // Set localStorage for Malayalam language before rendering
    localStorage.setItem('careone_lang', 'ml');

    render(
      <MemoryRouter>
        <PatientProvider initialStep="app">
          <PatientRecords />
        </PatientProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'രേഖകൾ' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /റിപ്പോർട്ടുകൾ/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /അളവുകൾ/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /മരുന്നുകൾ/i })).toBeInTheDocument();

    // Reset language
    localStorage.setItem('careone_lang', 'en');
  });
});
