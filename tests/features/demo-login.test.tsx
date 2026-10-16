import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PatientProvider } from '../../src/features/patient/PatientContext';
import { PatientSignIn } from '../../src/features/patient/PatientSignIn';
import { StaffSignIn } from '../../src/features/auth/StaffSignIn';
import { DemoAccountsCard } from '../../src/components/DemoAccountsCard';
import {
  PATIENT_DEMO_ACCOUNTS,
  STAFF_DEMO_ACCOUNTS,
  DEMO_PASSWORD,
} from '../../src/lib/demoAccounts';

// ─── helpers ────────────────────────────────────────────────────────────────

function mockConfigFetch(demoMode: boolean) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: unknown) => {
    const url = typeof input === 'string' ? input : (input as { url?: string })?.url || '';
    if (url.includes('/api/config')) {
      return new Response(JSON.stringify({ demoMode }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
}

function renderPatientSignIn() {
  return render(
    <MemoryRouter>
      <PatientProvider initialStep="welcome">
        <PatientSignIn />
      </PatientProvider>
    </MemoryRouter>
  );
}

function renderStaffSignIn() {
  return render(
    <MemoryRouter>
      <StaffSignIn />
    </MemoryRouter>
  );
}

// ─── demoAccounts.ts canonical list ─────────────────────────────────────────

describe('demoAccounts canonical list', () => {
  it('DEMO_PASSWORD is never empty', () => {
    expect(DEMO_PASSWORD.length).toBeGreaterThan(0);
  });

  it('PATIENT_DEMO_ACCOUNTS contains ABC-1001 and ABC-1002', () => {
    const usernames = PATIENT_DEMO_ACCOUNTS.map((a) => a.username);
    expect(usernames).toContain('ABC-1001');
    expect(usernames).toContain('ABC-1002');
  });

  it('STAFF_DEMO_ACCOUNTS contains all five staff usernames', () => {
    const usernames = STAFF_DEMO_ACCOUNTS.map((a) => a.username);
    expect(usernames).toContain('dr.rahul@example.com');
    expect(usernames).toContain('dr.anjali@example.com');
    expect(usernames).toContain('dr.thomas@example.com');
    expect(usernames).toContain('desk@example.com');
    expect(usernames).toContain('admin@example.com');
  });

  it('no account object contains a "password" property', () => {
    const all = [...PATIENT_DEMO_ACCOUNTS, ...STAFF_DEMO_ACCOUNTS];
    for (const a of all) {
      expect(Object.keys(a)).not.toContain('password');
    }
  });
});

// ─── DemoAccountsCard isolated ───────────────────────────────────────────────

describe('DemoAccountsCard — demoMode: true', () => {
  beforeEach(() => mockConfigFetch(true));
  afterEach(() => vi.restoreAllMocks());

  it('renders account buttons after fetch resolves', async () => {
    const onFill = vi.fn();
    const onFillAndSignIn = vi.fn();
    const ref = { current: null } as React.RefObject<HTMLButtonElement | null>;
    render(
      <MemoryRouter>
        <DemoAccountsCard
          accounts={PATIENT_DEMO_ACCOUNTS}
          onFill={onFill}
          onFillAndSignIn={onFillAndSignIn}
          submitBtnRef={ref}
        />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Arun Kumar')).toBeInTheDocument();
      expect(screen.getByText('Sujatha Nair')).toBeInTheDocument();
    });
  });

  it('Fill button calls onFill with username + DEMO_PASSWORD', async () => {
    const onFill = vi.fn();
    const onFillAndSignIn = vi.fn();
    const ref = { current: null } as React.RefObject<HTMLButtonElement | null>;
    render(
      <MemoryRouter>
        <DemoAccountsCard
          accounts={PATIENT_DEMO_ACCOUNTS}
          onFill={onFill}
          onFillAndSignIn={onFillAndSignIn}
          submitBtnRef={ref}
        />
      </MemoryRouter>
    );
    await waitFor(() => screen.getByText('Arun Kumar'));
    fireEvent.click(screen.getByRole('button', { name: /Arun Kumar/i }));
    expect(onFill).toHaveBeenCalledWith('ABC-1001', DEMO_PASSWORD);
  });

  it('Fill and sign in link calls onFillAndSignIn', async () => {
    const onFill = vi.fn();
    const onFillAndSignIn = vi.fn();
    const ref = { current: null } as React.RefObject<HTMLButtonElement | null>;
    render(
      <MemoryRouter>
        <DemoAccountsCard
          accounts={PATIENT_DEMO_ACCOUNTS}
          onFill={onFill}
          onFillAndSignIn={onFillAndSignIn}
          submitBtnRef={ref}
        />
      </MemoryRouter>
    );
    await waitFor(() => screen.getByText('Arun Kumar'));
    // "Fill and sign in" links are keyed per account
    const fillSignInLinks = screen.getAllByRole('button', { name: /fill and sign in/i });
    expect(fillSignInLinks[0]).toBeDefined();
    fireEvent.click(fillSignInLinks[0]!);
    expect(onFillAndSignIn).toHaveBeenCalledWith('ABC-1001', DEMO_PASSWORD);
  });

  it('renders all staff accounts for STAFF_DEMO_ACCOUNTS', async () => {
    const onFill = vi.fn();
    const onFillAndSignIn = vi.fn();
    const ref = { current: null } as React.RefObject<HTMLButtonElement | null>;
    render(
      <MemoryRouter>
        <DemoAccountsCard
          accounts={STAFF_DEMO_ACCOUNTS}
          onFill={onFill}
          onFillAndSignIn={onFillAndSignIn}
          submitBtnRef={ref}
        />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Dr. Rahul')).toBeInTheDocument();
      expect(screen.getByText('Dr. Anjali')).toBeInTheDocument();
      expect(screen.getByText('Dr. Thomas')).toBeInTheDocument();
      expect(screen.getAllByText('Front Desk')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Admin')[0]).toBeInTheDocument();
    });
  });
});

describe('DemoAccountsCard — demoMode: false', () => {
  beforeEach(() => mockConfigFetch(false));
  afterEach(() => vi.restoreAllMocks());

  it('renders nothing when demoMode is false', async () => {
    const onFill = vi.fn();
    const onFillAndSignIn = vi.fn();
    const ref = { current: null } as React.RefObject<HTMLButtonElement | null>;
    const { container } = render(
      <MemoryRouter>
        <DemoAccountsCard
          accounts={PATIENT_DEMO_ACCOUNTS}
          onFill={onFill}
          onFillAndSignIn={onFillAndSignIn}
          submitBtnRef={ref}
        />
      </MemoryRouter>
    );
    // Wait long enough for any fetch to resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('Arun Kumar')).not.toBeInTheDocument();
    expect(screen.queryByText('ABC-1001')).not.toBeInTheDocument();
  });
});

// ─── PatientSignIn integration ───────────────────────────────────────────────

describe('PatientSignIn — demo card integration — demoMode: true', () => {
  beforeEach(() => mockConfigFetch(true));
  afterEach(() => vi.restoreAllMocks());

  it('renders demo accounts card inside PatientSignIn', async () => {
    renderPatientSignIn();
    await waitFor(() => {
      expect(screen.getByText('Arun Kumar')).toBeInTheDocument();
      expect(screen.getByText('Sujatha Nair')).toBeInTheDocument();
    });
  });

  it('clicking Arun Kumar fill button updates username and password inputs', async () => {
    renderPatientSignIn();
    await waitFor(() => screen.getByText('Arun Kumar'));
    fireEvent.click(screen.getByRole('button', { name: /Arun Kumar/i }));
    expect(
      (screen.getByLabelText(/Hospital number/i) as HTMLInputElement).value
    ).toBe('ABC-1001');
    expect(
      (screen.getByLabelText(/^Password$/i) as HTMLInputElement).value
    ).toBe(DEMO_PASSWORD);
  });

  it('clicking Sujatha fill button updates username and password inputs', async () => {
    renderPatientSignIn();
    await waitFor(() => screen.getByText('Sujatha Nair'));
    fireEvent.click(screen.getByRole('button', { name: /Sujatha Nair/i }));
    expect(
      (screen.getByLabelText(/Hospital number/i) as HTMLInputElement).value
    ).toBe('ABC-1002');
    expect(
      (screen.getByLabelText(/^Password$/i) as HTMLInputElement).value
    ).toBe(DEMO_PASSWORD);
  });
});

describe('PatientSignIn — demo card hidden — demoMode: false', () => {
  beforeEach(() => mockConfigFetch(false));
  afterEach(() => vi.restoreAllMocks());

  it('no demo account labels visible when demoMode is false', async () => {
    renderPatientSignIn();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.queryByText('Arun Kumar')).not.toBeInTheDocument();
    expect(screen.queryByText('Sujatha Nair')).not.toBeInTheDocument();
    expect(screen.queryByText('ABC-1001')).not.toBeInTheDocument();
    expect(screen.queryByText('ABC-1002')).not.toBeInTheDocument();
  });
});

// ─── StaffSignIn integration ─────────────────────────────────────────────────

describe('StaffSignIn — demo card integration — demoMode: true', () => {
  beforeEach(() => mockConfigFetch(true));
  afterEach(() => vi.restoreAllMocks());

  it('renders all staff demo accounts inside StaffSignIn', async () => {
    renderStaffSignIn();
    await waitFor(() => {
      expect(screen.getByText('Dr. Rahul')).toBeInTheDocument();
      expect(screen.getByText('Dr. Anjali')).toBeInTheDocument();
      expect(screen.getByText('Dr. Thomas')).toBeInTheDocument();
      expect(screen.getAllByText('Front Desk')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Admin')[0]).toBeInTheDocument();
    });
  });

  it('clicking Dr. Rahul fill button updates email and password inputs', async () => {
    renderStaffSignIn();
    await waitFor(() => screen.getByText('Dr. Rahul'));
    fireEvent.click(screen.getByRole('button', { name: /Dr\. Rahul/i }));
    expect(
      (screen.getByLabelText(/Email/i) as HTMLInputElement).value
    ).toBe('dr.rahul@example.com');
    expect(
      (screen.getByLabelText(/^Password$/i) as HTMLInputElement).value
    ).toBe(DEMO_PASSWORD);
  });
});

describe('StaffSignIn — demo card hidden — demoMode: false', () => {
  beforeEach(() => mockConfigFetch(false));
  afterEach(() => vi.restoreAllMocks());

  it('no staff demo labels visible when demoMode is false', async () => {
    renderStaffSignIn();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.queryByText('Dr. Rahul')).not.toBeInTheDocument();
    expect(screen.queryByText('dr.rahul@example.com')).not.toBeInTheDocument();
  });
});
