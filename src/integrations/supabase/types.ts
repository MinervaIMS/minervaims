export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          section: string | null
          subsection: string | null
          user_email: string
          user_id: string
          user_role: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          section?: string | null
          subsection?: string | null
          user_email: string
          user_id: string
          user_role: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          section?: string | null
          subsection?: string | null
          user_email?: string
          user_id?: string
          user_role?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          username?: string
        }
        Relationships: []
      }
      ads_spending: {
        Row: {
          ad_date: string | null
          amount: number | null
          campaign_purpose: string | null
          content: string
          created_at: string
          created_by: string | null
          effectiveness_notes: string | null
          id: string
          platform: string | null
          treasury_entry_id: string | null
        }
        Insert: {
          ad_date?: string | null
          amount?: number | null
          campaign_purpose?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          effectiveness_notes?: string | null
          id?: string
          platform?: string | null
          treasury_entry_id?: string | null
        }
        Update: {
          ad_date?: string | null
          amount?: number | null
          campaign_purpose?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          effectiveness_notes?: string | null
          id?: string
          platform?: string | null
          treasury_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_spending_treasury_entry_id_fkey"
            columns: ["treasury_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni: {
        Row: {
          city: string | null
          company: string | null
          created_at: string
          graduation_year: number
          id: string
          job_area: string | null
          linkedin_url: string | null
          name: string
          surname: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          company?: string | null
          created_at?: string
          graduation_year: number
          id?: string
          job_area?: string | null
          linkedin_url?: string | null
          name: string
          surname: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          company?: string | null
          created_at?: string
          graduation_year?: number
          id?: string
          job_area?: string | null
          linkedin_url?: string | null
          name?: string
          surname?: string
          updated_at?: string
        }
        Relationships: []
      }
      alumni_call_participants: {
        Row: {
          alumni_id: string | null
          alumnus_name: string
          call_id: string
          created_at: string
          former_role: string | null
          id: string
        }
        Insert: {
          alumni_id?: string | null
          alumnus_name: string
          call_id: string
          created_at?: string
          former_role?: string | null
          id?: string
        }
        Update: {
          alumni_id?: string | null
          alumnus_name?: string
          call_id?: string
          created_at?: string
          former_role?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumni_call_participants_alumni_id_fkey"
            columns: ["alumni_id"]
            isOneToOne: false
            referencedRelation: "alumni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_call_participants_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "alumni_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_calls: {
        Row: {
          alumnus_name: string | null
          created_at: string
          created_by: string | null
          current_company: string | null
          current_position: string | null
          division: Database["public"]["Enums"]["org_division"] | null
          former_role: string | null
          id: string
          notes: string | null
          organiser_name: string | null
          planned_date: string | null
          responsible_person: string | null
          status: string
          updated_at: string
        }
        Insert: {
          alumnus_name?: string | null
          created_at?: string
          created_by?: string | null
          current_company?: string | null
          current_position?: string | null
          division?: Database["public"]["Enums"]["org_division"] | null
          former_role?: string | null
          id?: string
          notes?: string | null
          organiser_name?: string | null
          planned_date?: string | null
          responsible_person?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          alumnus_name?: string | null
          created_at?: string
          created_by?: string | null
          current_company?: string | null
          current_position?: string | null
          division?: Database["public"]["Enums"]["org_division"] | null
          former_role?: string | null
          id?: string
          notes?: string | null
          organiser_name?: string | null
          planned_date?: string | null
          responsible_person?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      alumni_contacts: {
        Row: {
          alumni_id: string
          created_at: string
          email: string | null
          id: string
          phone: string | null
        }
        Insert: {
          alumni_id: string
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
        }
        Update: {
          alumni_id?: string
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alumni_contacts_alumni_id_fkey"
            columns: ["alumni_id"]
            isOneToOne: true
            referencedRelation: "alumni"
            referencedColumns: ["id"]
          },
        ]
      }
      aod_days: {
        Row: {
          created_at: string
          created_by: string | null
          event_date: string
          id: string
          notes: string | null
          registration_open: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_date: string
          id?: string
          notes?: string | null
          registration_open?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_date?: string
          id?: string
          notes?: string | null
          registration_open?: boolean
        }
        Relationships: []
      }
      aod_signups: {
        Row: {
          created_at: string
          day_id: string
          division: Database["public"]["Enums"]["org_division"] | null
          id: string
          member_name: string
          slot_time: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          day_id: string
          division?: Database["public"]["Enums"]["org_division"] | null
          id?: string
          member_name: string
          slot_time: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          day_id?: string
          division?: Database["public"]["Enums"]["org_division"] | null
          id?: string
          member_name?: string
          slot_time?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aod_signups_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "aod_days"
            referencedColumns: ["id"]
          },
        ]
      }
      application_email_map: {
        Row: {
          description: string | null
          template_key: string
          trigger_code: string
        }
        Insert: {
          description?: string | null
          template_key: string
          trigger_code: string
        }
        Update: {
          description?: string | null
          template_key?: string
          trigger_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_email_map_template_key_fkey"
            columns: ["template_key"]
            isOneToOne: false
            referencedRelation: "auto_email_templates"
            referencedColumns: ["key"]
          },
        ]
      }
      application_notes: {
        Row: {
          application_id: string
          author_id: string | null
          author_name: string | null
          body: string
          created_at: string
          id: string
        }
        Insert: {
          application_id: string
          author_id?: string | null
          author_name?: string | null
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          application_id?: string
          author_id?: string | null
          author_name?: string | null
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_questions: {
        Row: {
          division: Database["public"]["Enums"]["org_division"]
          question: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          division: Database["public"]["Enums"]["org_division"]
          question?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          division?: Database["public"]["Enums"]["org_division"]
          question?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      application_settings: {
        Row: {
          applications_open: boolean
          apply_form_url: string
          auto_open: boolean
          end_date: string | null
          id: string
          semester_label: string
          start_date: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          applications_open?: boolean
          apply_form_url?: string
          auto_open?: boolean
          end_date?: string | null
          id?: string
          semester_label?: string
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          applications_open?: boolean
          apply_form_url?: string
          auto_open?: boolean
          end_date?: string | null
          id?: string
          semester_label?: string
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          academic_year: string
          answer_path: string | null
          bocconi_id: string
          created_at: string
          cv_path: string | null
          cv_viewed_at: string | null
          cv_viewed_by: string | null
          degree_course: string
          email: string
          first_choice: Database["public"]["Enums"]["org_division"]
          first_name: string
          id: string
          interview_division: Database["public"]["Enums"]["org_division"] | null
          linkedin_url: string | null
          offer_deadline: string | null
          offer_division: Database["public"]["Enums"]["org_division"] | null
          offer_fee_due: boolean
          offer_reminder_sent_at: string | null
          offer_role: string | null
          offer_sent_at: string | null
          phone: string
          received_email_sent_at: string | null
          second_choice: Database["public"]["Enums"]["org_division"] | null
          semester_label: string
          status: string
          surname: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          academic_year: string
          answer_path?: string | null
          bocconi_id: string
          created_at?: string
          cv_path?: string | null
          cv_viewed_at?: string | null
          cv_viewed_by?: string | null
          degree_course: string
          email: string
          first_choice: Database["public"]["Enums"]["org_division"]
          first_name: string
          id?: string
          interview_division?:
            | Database["public"]["Enums"]["org_division"]
            | null
          linkedin_url?: string | null
          offer_deadline?: string | null
          offer_division?: Database["public"]["Enums"]["org_division"] | null
          offer_fee_due?: boolean
          offer_reminder_sent_at?: string | null
          offer_role?: string | null
          offer_sent_at?: string | null
          phone: string
          received_email_sent_at?: string | null
          second_choice?: Database["public"]["Enums"]["org_division"] | null
          semester_label: string
          status?: string
          surname: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          academic_year?: string
          answer_path?: string | null
          bocconi_id?: string
          created_at?: string
          cv_path?: string | null
          cv_viewed_at?: string | null
          cv_viewed_by?: string | null
          degree_course?: string
          email?: string
          first_choice?: Database["public"]["Enums"]["org_division"]
          first_name?: string
          id?: string
          interview_division?:
            | Database["public"]["Enums"]["org_division"]
            | null
          linkedin_url?: string | null
          offer_deadline?: string | null
          offer_division?: Database["public"]["Enums"]["org_division"] | null
          offer_fee_due?: boolean
          offer_reminder_sent_at?: string | null
          offer_role?: string | null
          offer_sent_at?: string | null
          phone?: string
          received_email_sent_at?: string | null
          second_choice?: Database["public"]["Enums"]["org_division"] | null
          semester_label?: string
          status?: string
          surname?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      archive_files: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          division: string
          file_url: string
          fund: string | null
          id: string
          is_favourite: boolean
          page_count: number | null
          project: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          description?: string | null
          division: string
          file_url: string
          fund?: string | null
          id?: string
          is_favourite?: boolean
          page_count?: number | null
          project?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          division?: string
          file_url?: string
          fund?: string | null
          id?: string
          is_favourite?: boolean
          page_count?: number | null
          project?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      auto_email_templates: {
        Row: {
          body: string
          connected: boolean
          description: string | null
          file_url: string | null
          id: string
          key: string
          name: string
          recipient_description: string | null
          schedule_description: string | null
          subject: string
          trigger_description: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string
          connected?: boolean
          description?: string | null
          file_url?: string | null
          id?: string
          key: string
          name: string
          recipient_description?: string | null
          schedule_description?: string | null
          subject?: string
          trigger_description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          connected?: boolean
          description?: string | null
          file_url?: string | null
          id?: string
          key?: string
          name?: string
          recipient_description?: string | null
          schedule_description?: string | null
          subject?: string
          trigger_description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      calendar_entries: {
        Row: {
          author_name: string | null
          author_role: string | null
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          entry_type: string
          id: string
          location: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          author_role?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date: string
          entry_type?: string
          id?: string
          location?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          author_role?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_type?: string
          id?: string
          location?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      editorial_items: {
        Row: {
          created_at: string
          created_by: string | null
          event_id: string | null
          format: string
          id: string
          notes: string | null
          paid: boolean
          platform: string
          responsible_person: string | null
          scheduled_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          format?: string
          id?: string
          notes?: string | null
          paid?: boolean
          platform?: string
          responsible_person?: string | null
          scheduled_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          format?: string
          id?: string
          notes?: string | null
          paid?: boolean
          platform?: string
          responsible_person?: string | null
          scheduled_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          academic_year: string | null
          added_by: string | null
          affiliation: string | null
          attended: boolean
          email: string | null
          event_id: string
          id: string
          is_bocconi: boolean | null
          is_external: boolean
          is_member: boolean
          name: string
          programme: string | null
          registered_at: string
          user_id: string | null
        }
        Insert: {
          academic_year?: string | null
          added_by?: string | null
          affiliation?: string | null
          attended?: boolean
          email?: string | null
          event_id: string
          id?: string
          is_bocconi?: boolean | null
          is_external?: boolean
          is_member?: boolean
          name: string
          programme?: string | null
          registered_at?: string
          user_id?: string | null
        }
        Update: {
          academic_year?: string | null
          added_by?: string | null
          affiliation?: string | null
          attended?: boolean
          email?: string | null
          event_id?: string
          id?: string
          is_bocconi?: boolean | null
          is_external?: boolean
          is_member?: boolean
          name?: string
          programme?: string | null
          registered_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          division: Database["public"]["Enums"]["org_division"] | null
          end_at: string | null
          event_type: string
          guest: string[] | null
          id: string
          moderator: string | null
          online: boolean
          place: string
          poster_url: string | null
          registration_audience: string
          registration_enabled: boolean
          in_archive: boolean
          show_on_website: boolean
          start_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          description?: string | null
          division?: Database["public"]["Enums"]["org_division"] | null
          end_at?: string | null
          event_type?: string
          guest?: string[] | null
          id?: string
          moderator?: string | null
          online?: boolean
          place: string
          poster_url?: string | null
          registration_audience?: string
          registration_enabled?: boolean
          in_archive?: boolean
          show_on_website?: boolean
          start_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          division?: Database["public"]["Enums"]["org_division"] | null
          end_at?: string | null
          event_type?: string
          guest?: string[] | null
          id?: string
          moderator?: string | null
          online?: boolean
          place?: string
          poster_url?: string | null
          registration_audience?: string
          registration_enabled?: boolean
          in_archive?: boolean
          show_on_website?: boolean
          start_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      exam_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          label: string
          start_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          label: string
          start_date: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          label?: string
          start_date?: string
        }
        Relationships: []
      }
      fee_periods: {
        Row: {
          closed: boolean
          closed_at: string | null
          created_at: string
          created_by: string | null
          fee_amount: number
          first_deadline: string | null
          id: string
          second_deadline: string | null
          semester_label: string
          treasury_entry_id: string | null
        }
        Insert: {
          closed?: boolean
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          fee_amount?: number
          first_deadline?: string | null
          id?: string
          second_deadline?: string | null
          semester_label: string
          treasury_entry_id?: string | null
        }
        Update: {
          closed?: boolean
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          fee_amount?: number
          first_deadline?: string | null
          id?: string
          second_deadline?: string | null
          semester_label?: string
          treasury_entry_id?: string | null
        }
        Relationships: []
      }
      fund_performance_years: {
        Row: {
          fund: string
          id: string
          itd: string
          months: Json
          sharpe: string
          updated_at: string
          updated_by: string | null
          vol: string
          year: number
          ytd: string
        }
        Insert: {
          fund: string
          id?: string
          itd?: string
          months?: Json
          sharpe?: string
          updated_at?: string
          updated_by?: string | null
          vol?: string
          year: number
          ytd?: string
        }
        Update: {
          fund?: string
          id?: string
          itd?: string
          months?: Json
          sharpe?: string
          updated_at?: string
          updated_by?: string | null
          vol?: string
          year?: number
          ytd?: string
        }
        Relationships: []
      }
      fund_performances: {
        Row: {
          created_at: string
          created_by: string | null
          fund: string
          id: string
          monthly_return: number | null
          nav: number | null
          notes: string | null
          period_month: string
          updated_at: string
          ytd_return: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fund: string
          id?: string
          monthly_return?: number | null
          nav?: number | null
          notes?: string | null
          period_month: string
          updated_at?: string
          ytd_return?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fund?: string
          id?: string
          monthly_return?: number | null
          nav?: number | null
          notes?: string | null
          period_month?: string
          updated_at?: string
          ytd_return?: number | null
        }
        Relationships: []
      }
      interview_bookings: {
        Row: {
          application_id: string
          candidate_email: string
          candidate_name: string
          candidate_user_id: string | null
          created_at: string
          division: Database["public"]["Enums"]["org_division"]
          id: string
          slot_id: string
        }
        Insert: {
          application_id: string
          candidate_email: string
          candidate_name: string
          candidate_user_id?: string | null
          created_at?: string
          division: Database["public"]["Enums"]["org_division"]
          id?: string
          slot_id: string
        }
        Update: {
          application_id?: string
          candidate_email?: string
          candidate_name?: string
          candidate_user_id?: string | null
          created_at?: string
          division?: Database["public"]["Enums"]["org_division"]
          id?: string
          slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_bookings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: true
            referencedRelation: "interview_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_slots: {
        Row: {
          created_at: string
          created_by: string | null
          division: Database["public"]["Enums"]["org_division"]
          end_time: string
          examiner_id: string | null
          examiner_name: string | null
          id: string
          is_active: boolean
          is_booked: boolean
          meeting_link: string | null
          slot_date: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          division: Database["public"]["Enums"]["org_division"]
          end_time: string
          examiner_id?: string | null
          examiner_name?: string | null
          id?: string
          is_active?: boolean
          is_booked?: boolean
          meeting_link?: string | null
          slot_date: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          division?: Database["public"]["Enums"]["org_division"]
          end_time?: string
          examiner_id?: string | null
          examiner_name?: string | null
          id?: string
          is_active?: boolean
          is_booked?: boolean
          meeting_link?: string | null
          slot_date?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          account_status: string
          created_at: string
          deletion_scheduled_at: string | null
          display_order: number
          division: Database["public"]["Enums"]["org_division"]
          email: string | null
          fee_status: string
          first_name: string
          id: string
          is_public: boolean
          linkedin_url: string | null
          membership_status: string
          phone: string | null
          photo_url: string | null
          role: Database["public"]["Enums"]["app_role"]
          surname: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_status?: string
          created_at?: string
          deletion_scheduled_at?: string | null
          display_order?: number
          division?: Database["public"]["Enums"]["org_division"]
          email?: string | null
          fee_status?: string
          first_name: string
          id?: string
          is_public?: boolean
          linkedin_url?: string | null
          membership_status?: string
          phone?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          surname: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_status?: string
          created_at?: string
          deletion_scheduled_at?: string | null
          display_order?: number
          division?: Database["public"]["Enums"]["org_division"]
          email?: string | null
          fee_status?: string
          first_name?: string
          id?: string
          is_public?: boolean
          linkedin_url?: string | null
          membership_status?: string
          phone?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          surname?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      membership_fees: {
        Row: {
          amount: number | null
          collected_at: string | null
          collected_by: string | null
          id: string
          member_id: string
          paid: boolean
          period_id: string
        }
        Insert: {
          amount?: number | null
          collected_at?: string | null
          collected_by?: string | null
          id?: string
          member_id: string
          paid?: boolean
          period_id: string
        }
        Update: {
          amount?: number | null
          collected_at?: string | null
          collected_by?: string | null
          id?: string
          member_id?: string
          paid?: boolean
          period_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_fees_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_fees_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "fee_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          consent: boolean
          created_at: string
          email: string
          id: string
          source: string
          subscribed_at: string
          updated_at: string
        }
        Insert: {
          consent?: boolean
          created_at?: string
          email: string
          id?: string
          source?: string
          subscribed_at?: string
          updated_at?: string
        }
        Update: {
          consent?: boolean
          created_at?: string
          email?: string
          id?: string
          source?: string
          subscribed_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_visibility: {
        Row: {
          created_at: string
          is_hidden: boolean
          page_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          is_hidden?: boolean
          page_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          is_hidden?: boolean
          page_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      pricing_rate_limits: {
        Row: {
          key: string
          requested_at: string
        }
        Insert: {
          key: string
          requested_at?: string
        }
        Update: {
          key?: string
          requested_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      readings: {
        Row: {
          author: string
          contributor_name: string
          contributor_role: string
          contributor_surname: string
          created_at: string
          description: string
          display_order: number
          id: string
          publication_year: number | null
          reading_type: Database["public"]["Enums"]["reading_type"]
          title: string
          updated_at: string
        }
        Insert: {
          author: string
          contributor_name: string
          contributor_role: string
          contributor_surname: string
          created_at?: string
          description: string
          display_order?: number
          id?: string
          publication_year?: number | null
          reading_type: Database["public"]["Enums"]["reading_type"]
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          contributor_name?: string
          contributor_role?: string
          contributor_surname?: string
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          publication_year?: number | null
          reading_type?: Database["public"]["Enums"]["reading_type"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_deadlines: {
        Row: {
          created_at: string
          created_by: string | null
          division: Database["public"]["Enums"]["org_division"] | null
          due_date: string
          id: string
          notes: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          division?: Database["public"]["Enums"]["org_division"] | null
          due_date: string
          id?: string
          notes?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          division?: Database["public"]["Enums"]["org_division"] | null
          due_date?: string
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          level: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          resource?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      semester_members: {
        Row: {
          division: string | null
          email: string | null
          fee_paid: boolean
          fee_period_id: string | null
          first_name: string
          id: string
          member_id: string | null
          role: string | null
          semester_key: string
          semester_label: string
          snapshotted_at: string
          surname: string
        }
        Insert: {
          division?: string | null
          email?: string | null
          fee_paid?: boolean
          fee_period_id?: string | null
          first_name: string
          id?: string
          member_id?: string | null
          role?: string | null
          semester_key: string
          semester_label: string
          snapshotted_at?: string
          surname: string
        }
        Update: {
          division?: string | null
          email?: string | null
          fee_paid?: boolean
          fee_period_id?: string | null
          first_name?: string
          id?: string
          member_id?: string | null
          role?: string | null
          semester_key?: string
          semester_label?: string
          snapshotted_at?: string
          surname?: string
        }
        Relationships: []
      }
      semester_snapshots: {
        Row: {
          alumni_count: number
          created_at: string
          fee_period_id: string | null
          id: string
          members_count: number
          semester_key: string
          semester_label: string
        }
        Insert: {
          alumni_count?: number
          created_at?: string
          fee_period_id?: string | null
          id?: string
          members_count?: number
          semester_key: string
          semester_label: string
        }
        Update: {
          alumni_count?: number
          created_at?: string
          fee_period_id?: string | null
          id?: string
          members_count?: number
          semester_key?: string
          semester_label?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          display_order: number
          division: Database["public"]["Enums"]["team_division"] | null
          fund: Database["public"]["Enums"]["team_fund"] | null
          id: string
          is_board: boolean
          linkedin_url: string | null
          member_id: string | null
          name: string
          photo_url: string | null
          position: Database["public"]["Enums"]["team_position"]
          surname: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          division?: Database["public"]["Enums"]["team_division"] | null
          fund?: Database["public"]["Enums"]["team_fund"] | null
          id?: string
          is_board?: boolean
          linkedin_url?: string | null
          member_id?: string | null
          name: string
          photo_url?: string | null
          position: Database["public"]["Enums"]["team_position"]
          surname: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          division?: Database["public"]["Enums"]["team_division"] | null
          fund?: Database["public"]["Enums"]["team_fund"] | null
          id?: string
          is_board?: boolean
          linkedin_url?: string | null
          member_id?: string | null
          name?: string
          photo_url?: string | null
          position?: Database["public"]["Enums"]["team_position"]
          surname?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          alumni_id: string | null
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          name: string
          published: boolean
          quote: string
          role_label: string
          updated_at: string
        }
        Insert: {
          alumni_id?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          name: string
          published?: boolean
          quote: string
          role_label: string
          updated_at?: string
        }
        Update: {
          alumni_id?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          name?: string
          published?: boolean
          quote?: string
          role_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_alumni_id_fkey"
            columns: ["alumni_id"]
            isOneToOne: false
            referencedRelation: "alumni"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_entries: {
        Row: {
          academic_semester: string | null
          amount: number
          created_at: string
          created_by: string | null
          description: string
          division: Database["public"]["Enums"]["org_division"] | null
          execution_date: string
          flow: string
          id: string
          is_auto: boolean
          locked: boolean
          registration_date: string
          source: string | null
        }
        Insert: {
          academic_semester?: string | null
          amount: number
          created_at?: string
          created_by?: string | null
          description: string
          division?: Database["public"]["Enums"]["org_division"] | null
          execution_date: string
          flow: string
          id?: string
          is_auto?: boolean
          locked?: boolean
          registration_date?: string
          source?: string | null
        }
        Update: {
          academic_semester?: string | null
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string
          division?: Database["public"]["Enums"]["org_division"] | null
          execution_date?: string
          flow?: string
          id?: string
          is_auto?: boolean
          locked?: boolean
          registration_date?: string
          source?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          division: Database["public"]["Enums"]["org_division"] | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          division?: Database["public"]["Enums"]["org_division"] | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          division?: Database["public"]["Enums"]["org_division"] | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_resources: {
        Row: {
          author_id: string | null
          author_name: string | null
          author_role: string | null
          body: string | null
          category: string
          created_at: string
          description: string | null
          division: Database["public"]["Enums"]["org_division"]
          file_url: string | null
          id: string
          is_favourite: boolean
          is_primary: boolean
          link_url: string | null
          reason: string | null
          sources: Json
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          author_role?: string | null
          body?: string | null
          category: string
          created_at?: string
          description?: string | null
          division?: Database["public"]["Enums"]["org_division"]
          file_url?: string | null
          id?: string
          is_favourite?: boolean
          is_primary?: boolean
          link_url?: string | null
          reason?: string | null
          sources?: Json
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          author_role?: string | null
          body?: string | null
          category?: string
          created_at?: string
          description?: string | null
          division?: Database["public"]["Enums"]["org_division"]
          file_url?: string | null
          id?: string
          is_favourite?: boolean
          is_primary?: boolean
          link_url?: string | null
          reason?: string | null
          sources?: Json
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      build_member_email: {
        Args: { _first: string; _surname: string }
        Returns: string
      }
      can_manage_calendar: { Args: { uid: string }; Returns: boolean }
      claim_member_account: { Args: never; Returns: Json }
      cleanup_expelled_members: { Args: never; Returns: number }
      cleanup_expired_candidates: { Args: never; Returns: number }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      division_to_team_division: {
        Args: { _division: Database["public"]["Enums"]["org_division"] }
        Returns: Database["public"]["Enums"]["team_division"]
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_app_email: {
        Args: { p_key: string; p_to: string; p_vars?: Json }
        Returns: undefined
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      exam_break_on: { Args: { _d: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_board_member: { Args: { _user_id: string }; Returns: boolean }
      is_candidate: { Args: { _user_id: string }; Returns: boolean }
      is_full_access: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      italian_easter: { Args: { y: number }; Returns: string }
      italian_holiday_on: { Args: { d: string }; Returns: string }
      link_member_account: { Args: { p_user_id: string }; Returns: Json }
      log_activity: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id?: string
          p_entity_name?: string
          p_entity_type: string
          p_section?: string
          p_subsection?: string
        }
        Returns: undefined
      }
      member_division_read: {
        Args: {
          _division: Database["public"]["Enums"]["org_division"]
          _user_id: string
        }
        Returns: boolean
      }
      member_rank: {
        Args: {
          _division: Database["public"]["Enums"]["org_division"]
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: number
      }
      members_full_read: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      normalize_email_part: { Args: { _s: string }; Returns: string }
      pricing_rate_check: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      process_offer_deadlines: { Args: never; Returns: undefined }
      public_alumni_directory: { Args: never; Returns: Json }
      public_alumni_filter_count: {
        Args: { p_city?: string; p_company?: string; p_job_area?: string }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      role_to_team_position: {
        Args: {
          _division: Database["public"]["Enums"]["org_division"]
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: Database["public"]["Enums"]["team_position"]
      }
      roster_access_pair: {
        Args: {
          p_division: Database["public"]["Enums"]["org_division"]
          p_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: Record<string, unknown>
      }
      user_divisions: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["org_division"][]
      }
      verify_admin_credentials: {
        Args: { _password: string; _username: string }
        Returns: {
          admin_id: string
          admin_username: string
          is_valid: boolean
        }[]
      }
      workspace_member_count: { Args: never; Returns: number }
    }
    Enums: {
      app_role:
        | "admin"
        | "president"
        | "vice_president"
        | "head_of_asset_management"
        | "head_of_equity"
        | "head_of_investment"
        | "head_of_macro"
        | "head_of_portfolio"
        | "head_of_quant"
        | "head_of_operations"
        | "head_of_media"
        | "member"
        | "portfolio_manager"
        | "head_of_division"
        | "team_leader"
        | "analyst"
        | "media_analyst"
        | "advisor"
        | "silent_advisor"
        | "candidate"
        | "alumni"
        | "pending"
        | "senior_analyst"
      org_division:
        | "equity"
        | "investment"
        | "macro"
        | "portfolio"
        | "quant"
        | "media"
        | "operations"
        | "board"
        | "none"
      reading_type:
        | "academic_papers"
        | "technical_textbooks"
        | "free_time_readings"
      team_division:
        | "equity"
        | "investment"
        | "macro"
        | "portfolio"
        | "quant"
        | "operations"
      team_fund: "long-short" | "multi-asset" | "dps" | "pir"
      team_position:
        | "President"
        | "Vice President"
        | "Head of Asset Management"
        | "Head of Equity Research"
        | "Head of Investment Research"
        | "Head of Macro Research"
        | "Head of Portfolio Management"
        | "Head of Quantitative Research"
        | "Portfolio Manager"
        | "Senior Analyst"
        | "Analyst"
        | "Head of Operations"
        | "Head of Media"
        | "Operations"
        | "Media"
        | "Co-Head of Equity Research"
        | "Co-Head of Investment Research"
        | "Co-Head of Macro Research"
        | "Co-Head of Portfolio Management"
        | "Co-Head of Quantitative Research"
        | "Co-Head of Operations"
        | "Co-Head of Media"
        | "Advisor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "president",
        "vice_president",
        "head_of_asset_management",
        "head_of_equity",
        "head_of_investment",
        "head_of_macro",
        "head_of_portfolio",
        "head_of_quant",
        "head_of_operations",
        "head_of_media",
        "member",
        "portfolio_manager",
        "head_of_division",
        "team_leader",
        "analyst",
        "media_analyst",
        "advisor",
        "silent_advisor",
        "candidate",
        "alumni",
        "pending",
        "senior_analyst",
      ],
      org_division: [
        "equity",
        "investment",
        "macro",
        "portfolio",
        "quant",
        "media",
        "operations",
        "board",
        "none",
      ],
      reading_type: [
        "academic_papers",
        "technical_textbooks",
        "free_time_readings",
      ],
      team_division: [
        "equity",
        "investment",
        "macro",
        "portfolio",
        "quant",
        "operations",
      ],
      team_fund: ["long-short", "multi-asset", "dps", "pir"],
      team_position: [
        "President",
        "Vice President",
        "Head of Asset Management",
        "Head of Equity Research",
        "Head of Investment Research",
        "Head of Macro Research",
        "Head of Portfolio Management",
        "Head of Quantitative Research",
        "Portfolio Manager",
        "Senior Analyst",
        "Analyst",
        "Head of Operations",
        "Head of Media",
        "Operations",
        "Media",
        "Co-Head of Equity Research",
        "Co-Head of Investment Research",
        "Co-Head of Macro Research",
        "Co-Head of Portfolio Management",
        "Co-Head of Quantitative Research",
        "Co-Head of Operations",
        "Co-Head of Media",
        "Advisor",
      ],
    },
  },
} as const
