export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      allergies: {
        Row: {
          created_at: string;
          id: string;
          patient_id: string;
          reaction: string | null;
          recorded_by: string | null;
          severity: string;
          substance: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          patient_id: string;
          reaction?: string | null;
          recorded_by?: string | null;
          severity?: string;
          substance: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          patient_id?: string;
          reaction?: string | null;
          recorded_by?: string | null;
          severity?: string;
          substance?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'allergies_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'allergies_recorded_by_fkey';
            columns: ['recorded_by'];
            isOneToOne: false;
            referencedRelation: 'staff';
            referencedColumns: ['id'];
          },
        ];
      };
      appointments: {
        Row: {
          appointment_date: string;
          created_at: string;
          department_id: string | null;
          doctor_id: string;
          id: string;
          notes: string | null;
          patient_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          appointment_date: string;
          created_at?: string;
          department_id?: string | null;
          doctor_id: string;
          id?: string;
          notes?: string | null;
          patient_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          appointment_date?: string;
          created_at?: string;
          department_id?: string | null;
          doctor_id?: string;
          id?: string;
          notes?: string | null;
          patient_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'appointments_department_id_fkey';
            columns: ['department_id'];
            isOneToOne: false;
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'appointments_doctor_id_fkey';
            columns: ['doctor_id'];
            isOneToOne: false;
            referencedRelation: 'staff';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'appointments_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          at: string;
          id: number;
          new_row: Json | null;
          old_row: Json | null;
          patient_id: string | null;
          reason: string | null;
          record_id: string | null;
          table_name: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          at?: string;
          id?: never;
          new_row?: Json | null;
          old_row?: Json | null;
          patient_id?: string | null;
          reason?: string | null;
          record_id?: string | null;
          table_name?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          at?: string;
          id?: never;
          new_row?: Json | null;
          old_row?: Json | null;
          patient_id?: string | null;
          reason?: string | null;
          record_id?: string | null;
          table_name?: string | null;
        };
        Relationships: [];
      };
      care_team: {
        Row: {
          created_at: string;
          expires_at: string | null;
          id: string;
          patient_id: string;
          reason: string | null;
          revoked_at: string | null;
          staff_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          patient_id: string;
          reason?: string | null;
          revoked_at?: string | null;
          staff_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          patient_id?: string;
          reason?: string | null;
          revoked_at?: string | null;
          staff_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'care_team_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'care_team_staff_id_fkey';
            columns: ['staff_id'];
            isOneToOne: false;
            referencedRelation: 'staff';
            referencedColumns: ['id'];
          },
        ];
      };
      conditions: {
        Row: {
          created_at: string;
          department_id: string | null;
          diagnosed_date: string | null;
          doctor_id: string | null;
          id: string;
          name: string;
          notes: string | null;
          patient_id: string;
          sensitivity: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          department_id?: string | null;
          diagnosed_date?: string | null;
          doctor_id?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          patient_id: string;
          sensitivity?: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          department_id?: string | null;
          diagnosed_date?: string | null;
          doctor_id?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          patient_id?: string;
          sensitivity?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conditions_department_id_fkey';
            columns: ['department_id'];
            isOneToOne: false;
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conditions_doctor_id_fkey';
            columns: ['doctor_id'];
            isOneToOne: false;
            referencedRelation: 'staff';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conditions_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
        ];
      };
      consents: {
        Row: {
          agreed_at: string;
          consent_type: string;
          created_at: string;
          id: string;
          patient_id: string;
          user_id: string;
          version: string;
        };
        Insert: {
          agreed_at?: string;
          consent_type?: string;
          created_at?: string;
          id?: string;
          patient_id: string;
          user_id: string;
          version?: string;
        };
        Update: {
          agreed_at?: string;
          consent_type?: string;
          created_at?: string;
          id?: string;
          patient_id?: string;
          user_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'consents_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
        ];
      };
      departments: {
        Row: {
          archived_at: string | null;
          code: string;
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          archived_at?: string | null;
          code: string;
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          archived_at?: string | null;
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      emergency_access: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          patient_id: string;
          reason: string;
          staff_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          patient_id: string;
          reason: string;
          staff_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          patient_id?: string;
          reason?: string;
          staff_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'emergency_access_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'emergency_access_staff_id_fkey';
            columns: ['staff_id'];
            isOneToOne: false;
            referencedRelation: 'staff';
            referencedColumns: ['id'];
          },
        ];
      };
      encounter_addenda: {
        Row: {
          created_at: string;
          doctor_id: string;
          encounter_id: string;
          id: string;
          notes: string;
          patient_id: string;
          reason: string;
        };
        Insert: {
          created_at?: string;
          doctor_id: string;
          encounter_id: string;
          id?: string;
          notes: string;
          patient_id: string;
          reason: string;
        };
        Update: {
          created_at?: string;
          doctor_id?: string;
          encounter_id?: string;
          id?: string;
          notes?: string;
          patient_id?: string;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'encounter_addenda_doctor_id_fkey';
            columns: ['doctor_id'];
            isOneToOne: false;
            referencedRelation: 'staff';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'encounter_addenda_encounter_id_fkey';
            columns: ['encounter_id'];
            isOneToOne: false;
            referencedRelation: 'encounters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'encounter_addenda_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
        ];
      };
      encounters: {
        Row: {
          chief_complaint: string | null;
          clinical_notes: string | null;
          created_at: string;
          department_id: string | null;
          diagnosis: string | null;
          doctor_id: string;
          examination: string | null;
          id: string;
          patient_id: string;
          sensitivity: string;
          signed_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          chief_complaint?: string | null;
          clinical_notes?: string | null;
          created_at?: string;
          department_id?: string | null;
          diagnosis?: string | null;
          doctor_id: string;
          examination?: string | null;
          id?: string;
          patient_id: string;
          sensitivity?: string;
          signed_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          chief_complaint?: string | null;
          clinical_notes?: string | null;
          created_at?: string;
          department_id?: string | null;
          diagnosis?: string | null;
          doctor_id?: string;
          examination?: string | null;
          id?: string;
          patient_id?: string;
          sensitivity?: string;
          signed_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'encounters_department_id_fkey';
            columns: ['department_id'];
            isOneToOne: false;
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'encounters_doctor_id_fkey';
            columns: ['doctor_id'];
            isOneToOne: false;
            referencedRelation: 'staff';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'encounters_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
        ];
      };
      hospital_settings: {
        Row: {
          accent_color: string;
          casualty_phone: string;
          created_at: string;
          hospital_name: string;
          id: string;
          logo_path: string | null;
          logo_url: string | null;
          primary_color: string;
          secondary_color: string;
          short_code: string;
          time_zone: string;
          updated_at: string;
        };
        Insert: {
          accent_color?: string;
          casualty_phone?: string;
          created_at?: string;
          hospital_name?: string;
          id?: string;
          logo_path?: string | null;
          logo_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          short_code?: string;
          time_zone?: string;
          updated_at?: string;
        };
        Update: {
          accent_color?: string;
          casualty_phone?: string;
          created_at?: string;
          hospital_name?: string;
          id?: string;
          logo_path?: string | null;
          logo_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          short_code?: string;
          time_zone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      medications: {
        Row: {
          created_at: string;
          department_id: string | null;
          doctor_id: string;
          dose: string;
          drug: string;
          duration_days: number | null;
          id: string;
          instructions: string | null;
          patient_id: string;
          sensitivity: string;
          status: string;
          stopped_at: string | null;
          stopped_reason: string | null;
          timing: NonNullable<Json>;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          department_id?: string | null;
          doctor_id: string;
          dose: string;
          drug: string;
          duration_days?: number | null;
          id?: string;
          instructions?: string | null;
          patient_id: string;
          sensitivity?: string;
          status?: string;
          stopped_at?: string | null;
          stopped_reason?: string | null;
          timing?: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          department_id?: string | null;
          doctor_id?: string;
          dose?: string;
          drug?: string;
          duration_days?: number | null;
          id?: string;
          instructions?: string | null;
          patient_id?: string;
          sensitivity?: string;
          status?: string;
          stopped_at?: string | null;
          stopped_reason?: string | null;
          timing?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'medications_department_id_fkey';
            columns: ['department_id'];
            isOneToOne: false;
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'medications_doctor_id_fkey';
            columns: ['doctor_id'];
            isOneToOne: false;
            referencedRelation: 'staff';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'medications_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
        ];
      };
      observations: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          measured_at: string;
          out_of_range: boolean;
          patient_id: string;
          recorded_by: string | null;
          source: string;
          unit: string | null;
          value_text: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          measured_at?: string;
          out_of_range?: boolean;
          patient_id: string;
          recorded_by?: string | null;
          source?: string;
          unit?: string | null;
          value_text: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          measured_at?: string;
          out_of_range?: boolean;
          patient_id?: string;
          recorded_by?: string | null;
          source?: string;
          unit?: string | null;
          value_text?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'observations_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'observations_recorded_by_fkey';
            columns: ['recorded_by'];
            isOneToOne: false;
            referencedRelation: 'staff';
            referencedColumns: ['id'];
          },
        ];
      };
      patient_access: {
        Row: {
          created_at: string;
          id: string;
          patient_id: string;
          relationship: string;
          revoked_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          patient_id: string;
          relationship: string;
          revoked_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          patient_id?: string;
          relationship?: string;
          revoked_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'patient_access_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
        ];
      };
      patients: {
        Row: {
          blood_group: string | null;
          created_at: string;
          deleted_at: string | null;
          dob: string;
          email: string | null;
          full_name: string;
          gender: string;
          id: string;
          id_checked: boolean;
          phone: string;
          uhid: string;
        };
        Insert: {
          blood_group?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          dob: string;
          email?: string | null;
          full_name: string;
          gender: string;
          id?: string;
          id_checked?: boolean;
          phone: string;
          uhid?: string;
        };
        Update: {
          blood_group?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          dob?: string;
          email?: string | null;
          full_name?: string;
          gender?: string;
          id?: string;
          id_checked?: boolean;
          phone?: string;
          uhid?: string;
        };
        Relationships: [];
      };
      staff: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          department_id: string | null;
          full_name: string;
          id: string;
          is_active: boolean;
          phone: string | null;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          department_id?: string | null;
          full_name: string;
          id?: string;
          is_active?: boolean;
          phone?: string | null;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          department_id?: string | null;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          phone?: string | null;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_department_id_fkey';
            columns: ['department_id'];
            isOneToOne: false;
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      patient_timeline: {
        Row: {
          actor_id: string | null;
          details: string | null;
          event_id: string | null;
          event_type: string | null;
          happened_at: string | null;
          patient_id: string | null;
          sensitivity: string | null;
          status: string | null;
          title: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      generate_patient_uhid: { Args: Record<PropertyKey, never>; Returns: string };
      get_public_hospital_settings: { Args: Record<PropertyKey, never>; Returns: Json };
      log_chart_view: { Args: { p_patient_id: string }; Returns: undefined };
      request_emergency_access: {
        Args: { p_patient_id: string; p_reason: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
