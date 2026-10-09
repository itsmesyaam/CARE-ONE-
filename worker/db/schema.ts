import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// 1. Hospital Settings
export const hospitalSettings = sqliteTable('hospital_settings', {
  id: text('id').primaryKey(),
  hospitalName: text('hospital_name').notNull().default('ABC Hospital'),
  shortCode: text('short_code').default('ABC'),
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color').notNull().default('#0284c7'),
  secondaryColor: text('secondary_color').notNull().default('#0f172a'),
  casualtyPhone: text('casualty_phone').default('0484-2401122'),
  timeZone: text('time_zone').notNull().default('Asia/Kolkata'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 2. Departments
export const departments = sqliteTable('departments', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(),
  createdAt: text('created_at').notNull(),
});

// 3. Staff
export const staff = sqliteTable('staff', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  departmentId: text('department_id').references(() => departments.id),
  role: text('role', { enum: ['doctor', 'front_desk', 'admin'] }).notNull(),
  fullName: text('full_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull(),
  deletedAt: text('deleted_at'),
});

// 4. Patients
export const patients = sqliteTable('patients', {
  id: text('id').primaryKey(),
  uhid: text('uhid').unique(),
  mrn: text('mrn').unique(),
  fullName: text('full_name').notNull(),
  dob: text('dob'),
  dateOfBirth: text('date_of_birth'),
  gender: text('gender', { enum: ['male', 'female', 'other'] }).notNull(),
  bloodGroup: text('blood_group'),
  phone: text('phone'),
  email: text('email'),
  idChecked: integer('id_checked').notNull().default(0),
  createdAt: text('created_at').notNull(),
  deletedAt: text('deleted_at'),
});

// 5. Patient Access
export const patientAccess = sqliteTable('patient_access', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  userId: text('user_id').notNull(),
  relationship: text('relationship', { enum: ['self', 'guardian', 'caregiver'] }).notNull(),
  createdAt: text('created_at').notNull(),
  revokedAt: text('revoked_at'),
});

// 6. Consents
export const consents = sqliteTable('consents', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  userId: text('user_id').notNull(),
  consentType: text('consent_type').notNull().default('general'),
  version: text('version').notNull().default('1.0'),
  agreedAt: text('agreed_at').notNull(),
  createdAt: text('created_at').notNull(),
});

// 7. Care Team
export const careTeam = sqliteTable('care_team', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  staffId: text('staff_id').notNull().references(() => staff.id),
  reason: text('reason').default('appointment'),
  active: integer('active').notNull().default(1),
  expiresAt: text('expires_at'),
  revokedAt: text('revoked_at'),
  createdAt: text('created_at').notNull(),
});

// 8. Emergency Access
export const emergencyAccess = sqliteTable('emergency_access', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  staffId: text('staff_id').notNull().references(() => staff.id),
  reason: text('reason').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
});

// 9. Appointments
export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  doctorId: text('doctor_id').notNull().references(() => staff.id),
  departmentId: text('department_id').references(() => departments.id),
  appointmentDate: text('appointment_date'),
  startTime: text('start_time'),
  endTime: text('end_time'),
  status: text('status').notNull().default('booked'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 10. Encounters
export const encounters = sqliteTable('encounters', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  doctorId: text('doctor_id').notNull().references(() => staff.id),
  departmentId: text('department_id').references(() => departments.id),
  status: text('status', { enum: ['draft', 'signed'] }).notNull().default('draft'),
  sensitivity: text('sensitivity', { enum: ['normal', 'restricted'] }).notNull().default('normal'),
  chiefComplaint: text('chief_complaint'),
  clinicalNotes: text('clinical_notes'),
  subjective: text('subjective'),
  objective: text('objective'),
  assessment: text('assessment'),
  plan: text('plan'),
  diagnosis: text('diagnosis'),
  signedAt: text('signed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 11. Encounter Addenda
export const encounterAddenda = sqliteTable('encounter_addenda', {
  id: text('id').primaryKey(),
  encounterId: text('encounter_id').notNull().references(() => encounters.id),
  patientId: text('patient_id').notNull().references(() => patients.id),
  doctorId: text('doctor_id').notNull().references(() => staff.id),
  reason: text('reason').notNull(),
  notes: text('notes').notNull(),
  createdAt: text('created_at').notNull(),
});

// 12. Conditions
export const conditions = sqliteTable('conditions', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  doctorId: text('doctor_id').references(() => staff.id),
  departmentId: text('department_id').references(() => departments.id),
  name: text('name').notNull(),
  status: text('status', { enum: ['active', 'resolved'] }).notNull().default('active'),
  sensitivity: text('sensitivity', { enum: ['normal', 'restricted'] }).notNull().default('normal'),
  diagnosedDate: text('diagnosed_date'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 13. Allergies
export const allergies = sqliteTable('allergies', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  substance: text('substance').notNull(),
  reaction: text('reaction'),
  severity: text('severity', { enum: ['mild', 'moderate', 'severe'] }).notNull().default('moderate'),
  recordedBy: text('recorded_by').references(() => staff.id),
  createdAt: text('created_at').notNull(),
});

// 14. Medications
export const medications = sqliteTable('medications', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  doctorId: text('doctor_id').notNull().references(() => staff.id),
  departmentId: text('department_id').references(() => departments.id),
  drug: text('drug').notNull(),
  dose: text('dose').notNull(),
  timing: text('timing').notNull().default('{"morning":true,"afternoon":false,"night":true}'),
  durationDays: integer('duration_days'),
  instructions: text('instructions'),
  status: text('status', { enum: ['active', 'stopped', 'completed'] }).notNull().default('active'),
  stoppedReason: text('stopped_reason'),
  stoppedAt: text('stopped_at'),
  sensitivity: text('sensitivity', { enum: ['normal', 'restricted'] }).notNull().default('normal'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 15. Observations
export const observations = sqliteTable('observations', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  kind: text('kind').notNull(),
  valueText: text('value_text').notNull(),
  unit: text('unit'),
  source: text('source', { enum: ['clinic', 'patient'] }).notNull().default('clinic'),
  outOfRange: integer('out_of_range').notNull().default(0),
  measuredAt: text('measured_at').notNull(),
  recordedBy: text('recorded_by').references(() => staff.id),
  createdAt: text('created_at').notNull(),
});

// 16. Documents
export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  storagePath: text('storage_path').notNull().unique(),
  type: text('type', { enum: ['lab', 'imaging', 'prescription', 'other'] }).notNull().default('lab'),
  title: text('title').notNull(),
  reportDate: text('report_date').notNull(),
  source: text('source', { enum: ['patient', 'staff'] }).notNull().default('patient'),
  reviewStatus: text('review_status', { enum: ['pending', 'reviewed'] }).notNull().default('pending'),
  reviewedBy: text('reviewed_by').references(() => staff.id),
  reviewedAt: text('reviewed_at'),
  fileSizeBytes: integer('file_size_bytes'),
  mimeType: text('mime_type').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 17. Diet Guides
export const dietGuides = sqliteTable('diet_guides', {
  id: text('id').primaryKey(),
  titleEn: text('title_en').notNull(),
  titleMl: text('title_ml').notNull(),
  eatMoreEn: text('eat_more_en').notNull(),
  eatMoreMl: text('eat_more_ml').notNull(),
  eatLessEn: text('eat_less_en').notNull(),
  eatLessMl: text('eat_less_ml').notNull(),
  avoidEn: text('avoid_en').notNull(),
  avoidMl: text('avoid_ml').notNull(),
  tipsEn: text('tips_en').notNull(),
  tipsMl: text('tips_ml').notNull(),
  conditionTags: text('condition_tags').notNull().default('[]'),
  status: text('status', { enum: ['draft', 'approved'] }).notNull().default('draft'),
  approvedBy: text('approved_by').references(() => staff.id),
  approvedAt: text('approved_at'),
  version: integer('version').notNull().default(1),
  parentId: text('parent_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 18. Care Plans
export const carePlans = sqliteTable('care_plans', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  encounterId: text('encounter_id').references(() => encounters.id),
  doctorId: text('doctor_id').notNull().references(() => staff.id),
  status: text('status', { enum: ['active', 'completed', 'cancelled'] }).notNull().default('active'),
  title: text('title'),
  notes: text('notes'),
  reviewDate: text('review_date'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 19. Care Plan Items
export const carePlanItems = sqliteTable('care_plan_items', {
  id: text('id').primaryKey(),
  carePlanId: text('care_plan_id').notNull().references(() => carePlans.id),
  patientId: text('patient_id').notNull().references(() => patients.id),
  kind: text('kind').notNull(),
  detail: text('detail').notNull(),
  timing: text('timing'),
  dueDate: text('due_date'),
  dietGuideId: text('diet_guide_id').references(() => dietGuides.id),
  doctorNote: text('doctor_note'),
  status: text('status', { enum: ['pending', 'completed', 'cancelled'] }).notNull().default('pending'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 20. Reminders
export const reminders = sqliteTable('reminders', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  carePlanItemId: text('care_plan_item_id').references(() => carePlanItems.id),
  appointmentId: text('appointment_id').references(() => appointments.id),
  title: text('title').notNull(),
  scheduledFor: text('scheduled_for').notNull(),
  channel: text('channel', { enum: ['push', 'email'] }).notNull().default('push'),
  status: text('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  lastAttemptAt: text('last_attempt_at'),
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 21. Push Subscriptions
export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 22. Symptom Reports
export const symptomReports = sqliteTable('symptom_reports', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  description: text('description').notNull(),
  severity: text('severity', { enum: ['mild', 'moderate', 'severe'] }).notNull().default('moderate'),
  reportedAt: text('reported_at').notNull(),
  reviewedBy: text('reviewed_by').references(() => staff.id),
  reviewedAt: text('reviewed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 23. Audit Log
export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  at: text('at').notNull(),
  actorId: text('actor_id'),
  action: text('action').notNull(),
  tableName: text('table_name'),
  recordId: text('record_id'),
  patientId: text('patient_id'),
  reason: text('reason'),
  oldRow: text('old_row'),
  newRow: text('new_row'),
});

// 24. Sessions
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  userId: text('user_id').notNull(),
  role: text('role').notNull(),
  staffId: text('staff_id').references(() => staff.id),
  patientId: text('patient_id').references(() => patients.id),
  isMfaVerified: integer('is_mfa_verified').notNull().default(0),
  createdAt: text('created_at').notNull(),
  lastActiveAt: text('last_active_at').notNull(),
  expiresAt: text('expires_at').notNull(),
});

// 25. Email OTPs
export const emailOtps = sqliteTable('email_otps', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  codeHash: text('code_hash').notNull(),
  attempts: integer('attempts').notNull().default(0),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
});

// 26. Staff Auth
export const staffAuth = sqliteTable('staff_auth', {
  staffId: text('staff_id').primaryKey().references(() => staff.id),
  passwordHash: text('password_hash').notNull(),
  passwordSalt: text('password_salt').notNull(),
  totpSecret: text('totp_secret').notNull(),
  totpEnabled: integer('totp_enabled').notNull().default(1),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: text('locked_until'),
  updatedAt: text('updated_at').notNull(),
});
