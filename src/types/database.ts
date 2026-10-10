
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "allergies": {
                  Row: {
                    "created_at": string,"id": string,"patient_id": string,"reaction": string | null,"recorded_by": string | null,"severity": string,"substance": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"patient_id": string,"reaction"?: string | null,"recorded_by"?: string | null,"severity"?: string,"substance": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"patient_id"?: string,"reaction"?: string | null,"recorded_by"?: string | null,"severity"?: string,"substance"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "allergies_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "allergies_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"appointments": {
                  Row: {
                    "appointment_date": string,"created_at": string,"department_id": string | null,"doctor_id": string,"id": string,"notes": string | null,"patient_id": string,"status": string,"updated_at": string
                  }
                  Insert: {
                    "appointment_date": string,"created_at"?: string,"department_id"?: string | null,"doctor_id": string,"id"?: string,"notes"?: string | null,"patient_id": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "appointment_date"?: string,"created_at"?: string,"department_id"?: string | null,"doctor_id"?: string,"id"?: string,"notes"?: string | null,"patient_id"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "appointments_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"at": string,"id": number,"new_row": Json | null,"old_row": Json | null,"patient_id": string | null,"reason": string | null,"record_id": string | null,"table_name": string | null
                  }
                  Insert: {
                    "action": string,"actor_id"?: string | null,"at"?: string,"id"?: never,"new_row"?: Json | null,"old_row"?: Json | null,"patient_id"?: string | null,"reason"?: string | null,"record_id"?: string | null,"table_name"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"at"?: string,"id"?: never,"new_row"?: Json | null,"old_row"?: Json | null,"patient_id"?: string | null,"reason"?: string | null,"record_id"?: string | null,"table_name"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"care_plan_items": {
                  Row: {
                    "care_plan_id": string,"completed_at": string | null,"created_at": string,"detail": string,"diet_guide_id": string | null,"doctor_note": string | null,"due_date": string | null,"id": string,"kind": string,"patient_id": string,"status": string,"timing": Json | null,"updated_at": string
                  }
                  Insert: {
                    "care_plan_id": string,"completed_at"?: string | null,"created_at"?: string,"detail": string,"diet_guide_id"?: string | null,"doctor_note"?: string | null,"due_date"?: string | null,"id"?: string,"kind": string,"patient_id": string,"status"?: string,"timing"?: Json | null,"updated_at"?: string
                  }
                  Update: {
                    "care_plan_id"?: string,"completed_at"?: string | null,"created_at"?: string,"detail"?: string,"diet_guide_id"?: string | null,"doctor_note"?: string | null,"due_date"?: string | null,"id"?: string,"kind"?: string,"patient_id"?: string,"status"?: string,"timing"?: Json | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "care_plan_items_care_plan_id_fkey"
      columns: ["care_plan_id"]
isOneToOne: false
      referencedRelation: "care_plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "care_plan_items_diet_guide_id_fkey"
      columns: ["diet_guide_id"]
isOneToOne: false
      referencedRelation: "diet_guides"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "care_plan_items_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"care_plans": {
                  Row: {
                    "created_at": string,"doctor_id": string,"encounter_id": string | null,"id": string,"notes": string | null,"patient_id": string,"review_date": string | null,"status": string,"title": string | null,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"doctor_id": string,"encounter_id"?: string | null,"id"?: string,"notes"?: string | null,"patient_id": string,"review_date"?: string | null,"status"?: string,"title"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"doctor_id"?: string,"encounter_id"?: string | null,"id"?: string,"notes"?: string | null,"patient_id"?: string,"review_date"?: string | null,"status"?: string,"title"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "care_plans_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "care_plans_encounter_id_fkey"
      columns: ["encounter_id"]
isOneToOne: false
      referencedRelation: "encounters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "care_plans_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"care_team": {
                  Row: {
                    "created_at": string,"expires_at": string | null,"id": string,"patient_id": string,"reason": string | null,"revoked_at": string | null,"staff_id": string
                  }
                  Insert: {
                    "created_at"?: string,"expires_at"?: string | null,"id"?: string,"patient_id": string,"reason"?: string | null,"revoked_at"?: string | null,"staff_id": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string | null,"id"?: string,"patient_id"?: string,"reason"?: string | null,"revoked_at"?: string | null,"staff_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "care_team_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "care_team_staff_id_fkey"
      columns: ["staff_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"conditions": {
                  Row: {
                    "created_at": string,"department_id": string | null,"diagnosed_date": string | null,"doctor_id": string | null,"id": string,"name": string,"notes": string | null,"patient_id": string,"sensitivity": string,"status": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"department_id"?: string | null,"diagnosed_date"?: string | null,"doctor_id"?: string | null,"id"?: string,"name": string,"notes"?: string | null,"patient_id": string,"sensitivity"?: string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"department_id"?: string | null,"diagnosed_date"?: string | null,"doctor_id"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"patient_id"?: string,"sensitivity"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conditions_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conditions_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conditions_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"consents": {
                  Row: {
                    "agreed_at": string,"consent_type": string,"created_at": string,"id": string,"patient_id": string,"user_id": string,"version": string
                  }
                  Insert: {
                    "agreed_at"?: string,"consent_type"?: string,"created_at"?: string,"id"?: string,"patient_id": string,"user_id": string,"version"?: string
                  }
                  Update: {
                    "agreed_at"?: string,"consent_type"?: string,"created_at"?: string,"id"?: string,"patient_id"?: string,"user_id"?: string,"version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consents_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"departments": {
                  Row: {
                    "archived_at": string | null,"code": string,"created_at": string,"id": string,"name": string
                  }
                  Insert: {
                    "archived_at"?: string | null,"code": string,"created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "archived_at"?: string | null,"code"?: string,"created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"diet_guides": {
                  Row: {
                    "approved_at": string | null,"approved_by": string | null,"avoid_en": string,"avoid_ml": string,"condition_tags": (string)[],"created_at": string,"eat_less_en": string,"eat_less_ml": string,"eat_more_en": string,"eat_more_ml": string,"id": string,"parent_id": string | null,"status": string,"tips_en": string,"tips_ml": string,"title_en": string,"title_ml": string,"updated_at": string,"version": number
                  }
                  Insert: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"avoid_en": string,"avoid_ml": string,"condition_tags"?: (string)[],"created_at"?: string,"eat_less_en": string,"eat_less_ml": string,"eat_more_en": string,"eat_more_ml": string,"id"?: string,"parent_id"?: string | null,"status"?: string,"tips_en": string,"tips_ml": string,"title_en": string,"title_ml": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"avoid_en"?: string,"avoid_ml"?: string,"condition_tags"?: (string)[],"created_at"?: string,"eat_less_en"?: string,"eat_less_ml"?: string,"eat_more_en"?: string,"eat_more_ml"?: string,"id"?: string,"parent_id"?: string | null,"status"?: string,"tips_en"?: string,"tips_ml"?: string,"title_en"?: string,"title_ml"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "diet_guides_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "diet_guides_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "diet_guides"
      referencedColumns: ["id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "created_at": string,"file_size_bytes": number | null,"id": string,"mime_type": string,"patient_id": string,"report_date": string,"review_status": string,"reviewed_at": string | null,"reviewed_by": string | null,"source": string,"storage_path": string,"title": string,"type": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"file_size_bytes"?: number | null,"id"?: string,"mime_type": string,"patient_id": string,"report_date"?: string,"review_status"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"source"?: string,"storage_path": string,"title": string,"type"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"file_size_bytes"?: number | null,"id"?: string,"mime_type"?: string,"patient_id"?: string,"report_date"?: string,"review_status"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"source"?: string,"storage_path"?: string,"title"?: string,"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"emergency_access": {
                  Row: {
                    "created_at": string,"expires_at": string,"id": string,"patient_id": string,"reason": string,"staff_id": string
                  }
                  Insert: {
                    "created_at"?: string,"expires_at": string,"id"?: string,"patient_id": string,"reason": string,"staff_id": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"id"?: string,"patient_id"?: string,"reason"?: string,"staff_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "emergency_access_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "emergency_access_staff_id_fkey"
      columns: ["staff_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"encounter_addenda": {
                  Row: {
                    "created_at": string,"doctor_id": string,"encounter_id": string,"id": string,"notes": string,"patient_id": string,"reason": string
                  }
                  Insert: {
                    "created_at"?: string,"doctor_id": string,"encounter_id": string,"id"?: string,"notes": string,"patient_id": string,"reason": string
                  }
                  Update: {
                    "created_at"?: string,"doctor_id"?: string,"encounter_id"?: string,"id"?: string,"notes"?: string,"patient_id"?: string,"reason"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "encounter_addenda_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "encounter_addenda_encounter_id_fkey"
      columns: ["encounter_id"]
isOneToOne: false
      referencedRelation: "encounters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "encounter_addenda_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"encounters": {
                  Row: {
                    "chief_complaint": string | null,"clinical_notes": string | null,"created_at": string,"department_id": string | null,"diagnosis": string | null,"doctor_id": string,"examination": string | null,"id": string,"patient_id": string,"sensitivity": string,"signed_at": string | null,"status": string,"updated_at": string
                  }
                  Insert: {
                    "chief_complaint"?: string | null,"clinical_notes"?: string | null,"created_at"?: string,"department_id"?: string | null,"diagnosis"?: string | null,"doctor_id": string,"examination"?: string | null,"id"?: string,"patient_id": string,"sensitivity"?: string,"signed_at"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "chief_complaint"?: string | null,"clinical_notes"?: string | null,"created_at"?: string,"department_id"?: string | null,"diagnosis"?: string | null,"doctor_id"?: string,"examination"?: string | null,"id"?: string,"patient_id"?: string,"sensitivity"?: string,"signed_at"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "encounters_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "encounters_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "encounters_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"hospital_settings": {
                  Row: {
                    "accent_color": string,"casualty_phone": string,"created_at": string,"hospital_name": string,"id": string,"logo_path": string | null,"logo_url": string | null,"primary_color": string,"secondary_color": string,"short_code": string,"time_zone": string,"updated_at": string
                  }
                  Insert: {
                    "accent_color"?: string,"casualty_phone"?: string,"created_at"?: string,"hospital_name"?: string,"id"?: string,"logo_path"?: string | null,"logo_url"?: string | null,"primary_color"?: string,"secondary_color"?: string,"short_code"?: string,"time_zone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "accent_color"?: string,"casualty_phone"?: string,"created_at"?: string,"hospital_name"?: string,"id"?: string,"logo_path"?: string | null,"logo_url"?: string | null,"primary_color"?: string,"secondary_color"?: string,"short_code"?: string,"time_zone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"medications": {
                  Row: {
                    "created_at": string,"department_id": string | null,"doctor_id": string,"dose": string,"drug": string,"duration_days": number | null,"id": string,"instructions": string | null,"patient_id": string,"sensitivity": string,"status": string,"stopped_at": string | null,"stopped_reason": string | null,"timing": NonNullable<Json>,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"department_id"?: string | null,"doctor_id": string,"dose": string,"drug": string,"duration_days"?: number | null,"id"?: string,"instructions"?: string | null,"patient_id": string,"sensitivity"?: string,"status"?: string,"stopped_at"?: string | null,"stopped_reason"?: string | null,"timing"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"department_id"?: string | null,"doctor_id"?: string,"dose"?: string,"drug"?: string,"duration_days"?: number | null,"id"?: string,"instructions"?: string | null,"patient_id"?: string,"sensitivity"?: string,"status"?: string,"stopped_at"?: string | null,"stopped_reason"?: string | null,"timing"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "medications_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "medications_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "medications_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"observations": {
                  Row: {
                    "created_at": string,"id": string,"kind": string,"measured_at": string,"out_of_range": boolean,"patient_id": string,"recorded_by": string | null,"source": string,"unit": string | null,"value_text": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": string,"measured_at"?: string,"out_of_range"?: boolean,"patient_id": string,"recorded_by"?: string | null,"source"?: string,"unit"?: string | null,"value_text": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"measured_at"?: string,"out_of_range"?: boolean,"patient_id"?: string,"recorded_by"?: string | null,"source"?: string,"unit"?: string | null,"value_text"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "observations_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "observations_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"patient_access": {
                  Row: {
                    "created_at": string,"id": string,"patient_id": string,"relationship": string,"revoked_at": string | null,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"patient_id": string,"relationship": string,"revoked_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"patient_id"?: string,"relationship"?: string,"revoked_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "patient_access_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"patients": {
                  Row: {
                    "blood_group": string | null,"created_at": string,"deleted_at": string | null,"dob": string,"email": string | null,"full_name": string,"gender": string,"id": string,"id_checked": boolean,"phone": string,"uhid": string
                  }
                  Insert: {
                    "blood_group"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"dob": string,"email"?: string | null,"full_name": string,"gender": string,"id"?: string,"id_checked"?: boolean,"phone": string,"uhid"?: string
                  }
                  Update: {
                    "blood_group"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"dob"?: string,"email"?: string | null,"full_name"?: string,"gender"?: string,"id"?: string,"id_checked"?: boolean,"phone"?: string,"uhid"?: string
                  }
                  Relationships: [
                    
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"p256dh": string,"updated_at": string,"user_agent": string | null,"user_id": string
                  }
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"p256dh": string,"updated_at"?: string,"user_agent"?: string | null,"user_id": string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"p256dh"?: string,"updated_at"?: string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reminders": {
                  Row: {
                    "appointment_id": string | null,"attempts": number,"care_plan_item_id": string | null,"channel": string,"created_at": string,"error_message": string | null,"id": string,"last_attempt_at": string | null,"patient_id": string,"scheduled_for": string,"status": string,"title": string
                  }
                  Insert: {
                    "appointment_id"?: string | null,"attempts"?: number,"care_plan_item_id"?: string | null,"channel"?: string,"created_at"?: string,"error_message"?: string | null,"id"?: string,"last_attempt_at"?: string | null,"patient_id": string,"scheduled_for"?: string,"status"?: string,"title": string
                  }
                  Update: {
                    "appointment_id"?: string | null,"attempts"?: number,"care_plan_item_id"?: string | null,"channel"?: string,"created_at"?: string,"error_message"?: string | null,"id"?: string,"last_attempt_at"?: string | null,"patient_id"?: string,"scheduled_for"?: string,"status"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reminders_appointment_id_fkey"
      columns: ["appointment_id"]
isOneToOne: false
      referencedRelation: "appointments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reminders_care_plan_item_id_fkey"
      columns: ["care_plan_item_id"]
isOneToOne: false
      referencedRelation: "care_plan_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reminders_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"staff": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"department_id": string | null,"full_name": string,"id": string,"is_active": boolean,"phone": string | null,"role": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"department_id"?: string | null,"full_name": string,"id"?: string,"is_active"?: boolean,"phone"?: string | null,"role": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"department_id"?: string | null,"full_name"?: string,"id"?: string,"is_active"?: boolean,"phone"?: string | null,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"symptom_reports": {
                  Row: {
                    "created_at": string,"description": string,"id": string,"patient_id": string,"reported_at": string,"reviewed_at": string | null,"reviewed_by": string | null,"severity": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"description": string,"id"?: string,"patient_id": string,"reported_at"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"severity"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"patient_id"?: string,"reported_at"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"severity"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "symptom_reports_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "symptom_reports_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "patient_timeline": {
                  Row: {
                    "actor_id": string | null,"details": string | null,"event_id": string | null,"event_type": string | null,"happened_at": string | null,"patient_id": string | null,"sensitivity": string | null,"status": string | null,"title": string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "claim_due_reminders":
{ Args: { "p_limit"?: number }; Returns: {
              "appointment_id": string | null,
"attempts": number,
"care_plan_item_id": string | null,
"channel": string,
"created_at": string,
"error_message": string | null,
"id": string,
"last_attempt_at": string | null,
"patient_id": string,
"scheduled_for": string,
"status": string,
"title": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "reminders"
        isOneToOne: false
        isSetofReturn: true
      } },
"create_test_reminder":
{ Args: { "p_patient_id": string }; Returns: string
                           },
"generate_daily_medicine_reminders":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"generate_patient_uhid":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"get_admin_audit_logs":
{ Args: { "p_action"?: string,"p_end_date"?: string,"p_limit"?: number,"p_offset"?: number,"p_staff_id"?: string,"p_start_date"?: string }; Returns: {
              "action": string,"actor_id": string,"actor_name": string,"actor_role": string,"at": string,"id": number,"patient_id": string,"reason": string,"record_id": string,"table_name": string
            }[]
                           },
"get_admin_dashboard_counts":
{ Args: Record<PropertyKey, never>; Returns: {
              "active_patient_share": number,"active_patients_30d": number,"consultations_this_month": number,"follow_ups_due": number,"invited_patients": number,"patients_overdue_follow_up": number,"reports_waiting_review": number,"today_appointments": number
            }[]
                           },
"get_public_hospital_settings":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"log_chart_view":
{ Args: { "p_patient_id": string }; Returns: undefined
                           },
"request_emergency_access":
{ Args: { "p_patient_id": string,"p_reason": string }; Returns: string
                           },
"what_changed":
{ Args: { "p_patient_id": string }; Returns: {
              "happened_at": string,"kind": string,"ref_id": string,"ref_table": string,"summary": string
            }[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
