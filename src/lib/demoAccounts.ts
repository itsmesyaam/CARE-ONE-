export const DEMO_PASSWORD = 'DemoPassword123!';

export interface DemoAccount {
  username: string;
  label: string;
  descriptionKey: string;
}

export const PATIENT_DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: 'ABC-1001',
    label: 'Arun Kumar',
    descriptionKey: 'demo.arunDesc',
  },
  {
    username: 'ABC-1002',
    label: 'Sujatha Nair',
    descriptionKey: 'demo.sujathaDesc',
  },
];

export const STAFF_DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: 'dr.rahul@example.com',
    label: 'Dr. Rahul',
    descriptionKey: 'demo.rahulDesc',
  },
  {
    username: 'dr.anjali@example.com',
    label: 'Dr. Anjali',
    descriptionKey: 'demo.anjaliDesc',
  },
  {
    username: 'dr.thomas@example.com',
    label: 'Dr. Thomas',
    descriptionKey: 'demo.thomasDesc',
  },
  {
    username: 'desk@example.com',
    label: 'Front Desk',
    descriptionKey: 'demo.deskDesc',
  },
  {
    username: 'admin@example.com',
    label: 'Admin',
    descriptionKey: 'demo.adminDesc',
  },
];
