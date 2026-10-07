import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DepartmentList } from '../../src/features/admin/DepartmentList';
import { StaffList } from '../../src/features/admin/StaffList';
import { InviteStaffDialog } from '../../src/features/admin/InviteStaffDialog';
import { DepartmentFormDialog } from '../../src/features/admin/DepartmentFormDialog';

describe('Admin Feature: Department Management & Staff Directory', () => {
  const mockDepartments = [
    {
      id: 'd1',
      name: 'General Medicine',
      code: 'GEN',
      archived_at: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'd2',
      name: 'Cardiology',
      code: 'CARDIO',
      archived_at: '2026-10-01T00:00:00Z',
      created_at: new Date().toISOString(),
    },
  ];

  const mockStaff = [
    {
      id: 's1',
      user_id: 'u1',
      full_name: 'Dr. Ramesh Kumar',
      role: 'doctor' as const,
      department_id: 'd1',
      departments: { name: 'General Medicine' },
      phone: '9847012345',
      is_active: true,
      created_at: new Date().toISOString(),
      deleted_at: null,
    },
    {
      id: 's2',
      user_id: 'u2',
      full_name: 'Anjali Nair',
      role: 'front_desk' as const,
      department_id: null,
      departments: null,
      phone: '9847054321',
      is_active: false,
      created_at: new Date().toISOString(),
      deleted_at: null,
    },
  ];

  it('renders DepartmentList with active and archived indicators', () => {
    const onAdd = vi.fn();
    const onEdit = vi.fn();
    const onToggleArchive = vi.fn();

    render(
      <DepartmentList
        departments={mockDepartments}
        onAdd={onAdd}
        onEdit={onEdit}
        onToggleArchive={onToggleArchive}
      />
    );

    expect(screen.getByText('General Medicine')).toBeInTheDocument();
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('GEN')).toBeInTheDocument();
    expect(screen.getByText('CARDIO')).toBeInTheDocument();
  });

  it('renders StaffList with roles, departments and active badges', () => {
    const onInvite = vi.fn();
    const onToggleActive = vi.fn();

    render(<StaffList staff={mockStaff} onInvite={onInvite} onToggleActive={onToggleActive} />);

    expect(screen.getByText('Dr. Ramesh Kumar')).toBeInTheDocument();
    expect(screen.getByText('Anjali Nair')).toBeInTheDocument();
  });

  it('validates InviteStaffDialog input and calls onInvite', async () => {
    const onInvite = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <InviteStaffDialog
        isOpen={true}
        departments={mockDepartments}
        onClose={onClose}
        onInvite={onInvite}
      />
    );

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Dr. Meera Mohan' },
    });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'meera@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Role/i), {
      target: { value: 'doctor' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Send Invite/i }));

    await waitFor(() => {
      expect(onInvite).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Dr. Meera Mohan',
          email: 'meera@example.com',
          role: 'doctor',
        })
      );
    });
  });

  it('validates DepartmentFormDialog input and calls onSave', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<DepartmentFormDialog isOpen={true} onClose={onClose} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText(/Department Name/i), {
      target: { value: 'Pediatrics' },
    });
    fireEvent.change(screen.getByLabelText(/Code/i), {
      target: { value: 'PED' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        name: 'Pediatrics',
        code: 'PED',
      });
    });
  });
});
