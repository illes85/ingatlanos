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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          actor_id: string | null
          body: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          id: string
          occurred_at: string
          organization_id: string
          payload: Json
          property_id: string | null
          title: string
          type: Database["public"]["Enums"]["activity_type"]
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          occurred_at?: string
          organization_id: string
          payload?: Json
          property_id?: string | null
          title: string
          type: Database["public"]["Enums"]["activity_type"]
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          occurred_at?: string
          organization_id?: string
          payload?: Json
          property_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["activity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          cost_usd: number
          created_at: string
          credits: number
          feature: string
          id: string
          input_tokens: number
          is_mock: boolean
          model: string | null
          organization_id: string
          output_tokens: number
          user_id: string | null
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          credits?: number
          feature: string
          id?: string
          input_tokens?: number
          is_mock?: boolean
          model?: string | null
          organization_id: string
          output_tokens?: number
          user_id?: string | null
        }
        Update: {
          cost_usd?: number
          created_at?: string
          credits?: number
          feature?: string
          id?: string
          input_tokens?: number
          is_mock?: boolean
          model?: string | null
          organization_id?: string
          output_tokens?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          contact_id: string | null
          created_at: string
          deal_id: string | null
          ends_at: string | null
          external_id: string | null
          external_provider: string | null
          id: string
          kind: Database["public"]["Enums"]["event_kind"]
          location: string | null
          organization_id: string
          owner_id: string | null
          property_id: string | null
          showing_id: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          ends_at?: string | null
          external_id?: string | null
          external_provider?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["event_kind"]
          location?: string | null
          organization_id: string
          owner_id?: string | null
          property_id?: string | null
          showing_id?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          ends_at?: string | null
          external_id?: string | null
          external_provider?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["event_kind"]
          location?: string | null
          organization_id?: string
          owner_id?: string | null
          property_id?: string | null
          showing_id?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_showing_id_fkey"
            columns: ["showing_id"]
            isOneToOne: false
            referencedRelation: "showings"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_splits: {
        Row: {
          agent_id: string
          amount: number
          commission_id: string
          created_at: string
          id: string
          organization_id: string
          pct: number
          role: Database["public"]["Enums"]["split_role"]
        }
        Insert: {
          agent_id: string
          amount: number
          commission_id: string
          created_at?: string
          id?: string
          organization_id: string
          pct: number
          role: Database["public"]["Enums"]["split_role"]
        }
        Update: {
          agent_id?: string
          amount?: number
          commission_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          pct?: number
          role?: Database["public"]["Enums"]["split_role"]
        }
        Relationships: [
          {
            foreignKeyName: "commission_splits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_splits_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_splits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          created_at: string
          currency: string
          deal_id: string | null
          earned_at: string | null
          expected_date: string | null
          gross_amount: number
          id: string
          notes: string | null
          office_share_pct: number
          organization_id: string
          paid_at: string | null
          property_id: string | null
          status: Database["public"]["Enums"]["commission_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          deal_id?: string | null
          earned_at?: string | null
          expected_date?: string | null
          gross_amount: number
          id?: string
          notes?: string | null
          office_share_pct?: number
          organization_id: string
          paid_at?: string | null
          property_id?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          deal_id?: string | null
          earned_at?: string | null
          expected_date?: string | null
          gross_amount?: number
          id?: string
          notes?: string | null
          office_share_pct?: number
          organization_id?: string
          paid_at?: string | null
          property_id?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          anonymized_at: string | null
          company: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          first_name: string
          full_name: string | null
          gdpr_consent_at: string | null
          gdpr_consent_scope: string[]
          gdpr_notice_version: string | null
          id: string
          last_contacted_at: string | null
          last_name: string
          notes: string | null
          organization_id: string
          owner_agent_id: string | null
          phone: string | null
          phone_normalized: string | null
          pmt_checked_at: string | null
          pmt_next_review_at: string | null
          pmt_risk_level: Database["public"]["Enums"]["risk_level"] | null
          pmt_status: Database["public"]["Enums"]["pmt_status"]
          postal_address: string | null
          roles: Database["public"]["Enums"]["contact_role"][]
          source: Database["public"]["Enums"]["lead_source"] | null
          source_detail: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          anonymized_at?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          first_name?: string
          full_name?: string | null
          gdpr_consent_at?: string | null
          gdpr_consent_scope?: string[]
          gdpr_notice_version?: string | null
          id?: string
          last_contacted_at?: string | null
          last_name?: string
          notes?: string | null
          organization_id: string
          owner_agent_id?: string | null
          phone?: string | null
          phone_normalized?: string | null
          pmt_checked_at?: string | null
          pmt_next_review_at?: string | null
          pmt_risk_level?: Database["public"]["Enums"]["risk_level"] | null
          pmt_status?: Database["public"]["Enums"]["pmt_status"]
          postal_address?: string | null
          roles?: Database["public"]["Enums"]["contact_role"][]
          source?: Database["public"]["Enums"]["lead_source"] | null
          source_detail?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          anonymized_at?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          first_name?: string
          full_name?: string | null
          gdpr_consent_at?: string | null
          gdpr_consent_scope?: string[]
          gdpr_notice_version?: string | null
          id?: string
          last_contacted_at?: string | null
          last_name?: string
          notes?: string | null
          organization_id?: string
          owner_agent_id?: string | null
          phone?: string | null
          phone_normalized?: string | null
          pmt_checked_at?: string | null
          pmt_next_review_at?: string | null
          pmt_risk_level?: Database["public"]["Enums"]["risk_level"] | null
          pmt_status?: Database["public"]["Enums"]["pmt_status"]
          postal_address?: string | null
          roles?: Database["public"]["Enums"]["contact_role"][]
          source?: Database["public"]["Enums"]["lead_source"] | null
          source_detail?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_owner_agent_id_fkey"
            columns: ["owner_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          created_at: string
          created_by: string | null
          delta: number
          id: string
          organization_id: string
          reason: string
          ref_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delta: number
          id?: string
          organization_id: string
          reason: string
          ref_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delta?: number
          id?: string
          organization_id?: string
          reason?: string
          ref_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          deal_id: string
          from_stage: Database["public"]["Enums"]["deal_stage"] | null
          id: string
          organization_id: string
          to_stage: Database["public"]["Enums"]["deal_stage"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          deal_id: string
          from_stage?: Database["public"]["Enums"]["deal_stage"] | null
          id?: string
          organization_id: string
          to_stage: Database["public"]["Enums"]["deal_stage"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          deal_id?: string
          from_stage?: Database["public"]["Enums"]["deal_stage"] | null
          id?: string
          organization_id?: string
          to_stage?: Database["public"]["Enums"]["deal_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          agent_id: string | null
          closed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          expected_close_date: string | null
          expected_value: number | null
          id: string
          lost_reason: string | null
          notes: string | null
          organization_id: string
          probability: number | null
          property_id: string | null
          side: Database["public"]["Enums"]["deal_side"]
          stage: Database["public"]["Enums"]["deal_stage"]
          stage_entered_at: string
          status: Database["public"]["Enums"]["deal_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_close_date?: string | null
          expected_value?: number | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          organization_id: string
          probability?: number | null
          property_id?: string | null
          side: Database["public"]["Enums"]["deal_side"]
          stage: Database["public"]["Enums"]["deal_stage"]
          stage_entered_at?: string
          status?: Database["public"]["Enums"]["deal_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_close_date?: string | null
          expected_value?: number | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          organization_id?: string
          probability?: number | null
          property_id?: string | null
          side?: Database["public"]["Enums"]["deal_side"]
          stage?: Database["public"]["Enums"]["deal_stage"]
          stage_entered_at?: string
          status?: Database["public"]["Enums"]["deal_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          active: boolean
          body: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["document_kind"]
          name: string
          organization_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          body?: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["document_kind"]
          name: string
          organization_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["document_kind"]
          name?: string
          organization_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string | null
          data: Json
          deal_id: string | null
          id: string
          kind: Database["public"]["Enums"]["document_kind"]
          organization_id: string
          property_id: string | null
          status: Database["public"]["Enums"]["document_status"]
          storage_path: string | null
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          deal_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["document_kind"]
          organization_id: string
          property_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          deal_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["document_kind"]
          organization_id?: string
          property_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ai_score: number | null
          ai_score_reason: string | null
          assigned_to: string | null
          consent_at: string | null
          contact_id: string | null
          converted_at: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization_id: string
          phone: string | null
          phone_normalized: string | null
          property_id: string | null
          raw_message: string | null
          read_at: string | null
          received_at: string
          source: Database["public"]["Enums"]["lead_source"]
          source_detail: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          urgent: boolean
        }
        Insert: {
          ai_score?: number | null
          ai_score_reason?: string | null
          assigned_to?: string | null
          consent_at?: string | null
          contact_id?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id: string
          phone?: string | null
          phone_normalized?: string | null
          property_id?: string | null
          raw_message?: string | null
          read_at?: string | null
          received_at?: string
          source?: Database["public"]["Enums"]["lead_source"]
          source_detail?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          urgent?: boolean
        }
        Update: {
          ai_score?: number | null
          ai_score_reason?: string | null
          assigned_to?: string | null
          consent_at?: string | null
          contact_id?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string
          phone?: string | null
          phone_normalized?: string | null
          property_id?: string | null
          raw_message?: string | null
          read_at?: string | null
          received_at?: string
          source?: Database["public"]["Enums"]["lead_source"]
          source_detail?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          urgent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      lookup_values: {
        Row: {
          active: boolean
          category: string
          id: string
          key: string
          label: string
          organization_id: string | null
          sort_order: number
        }
        Insert: {
          active?: boolean
          category: string
          id?: string
          key: string
          label: string
          organization_id?: string | null
          sort_order?: number
        }
        Update: {
          active?: boolean
          category?: string
          id?: string
          key?: string
          label?: string
          organization_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "lookup_values_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      market_snapshots: {
        Row: {
          avg_price_per_sqm: number
          city: string
          district: number | null
          id: string
          median_price_per_sqm: number | null
          period: string
          property_type: Database["public"]["Enums"]["property_type"]
          sample_size: number
          source: string
        }
        Insert: {
          avg_price_per_sqm: number
          city: string
          district?: number | null
          id?: string
          median_price_per_sqm?: number | null
          period: string
          property_type: Database["public"]["Enums"]["property_type"]
          sample_size?: number
          source?: string
        }
        Update: {
          avg_price_per_sqm?: number
          city?: string
          district?: number | null
          id?: string
          median_price_per_sqm?: number | null
          period?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          sample_size?: number
          source?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          organization_id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          organization_id: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          organization_id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          amount: number
          buyer_contact_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          deposit_amount: number | null
          deposit_deadline: string | null
          id: string
          kind: Database["public"]["Enums"]["offer_kind"]
          notes: string | null
          organization_id: string
          parent_offer_id: string | null
          property_id: string
          status: Database["public"]["Enums"]["offer_status"]
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          amount: number
          buyer_contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deposit_amount?: number | null
          deposit_deadline?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["offer_kind"]
          notes?: string | null
          organization_id: string
          parent_offer_id?: string | null
          property_id: string
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          amount?: number
          buyer_contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deposit_amount?: number | null
          deposit_deadline?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["offer_kind"]
          notes?: string | null
          organization_id?: string
          parent_offer_id?: string | null
          property_id?: string
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_buyer_contact_id_fkey"
            columns: ["buyer_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_parent_offer_id_fkey"
            columns: ["parent_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          ai_credit_balance: number
          ai_credit_monthly: number
          brand_color: string | null
          created_at: string
          id: string
          is_demo: boolean
          logo_path: string | null
          name: string
          plan: Database["public"]["Enums"]["plan_tier"]
          property_seq: number
          settings: Json
          slug: string
          trial_ends_at: string | null
          trial_plan: Database["public"]["Enums"]["plan_tier"] | null
          type: Database["public"]["Enums"]["org_type"]
          updated_at: string
        }
        Insert: {
          ai_credit_balance?: number
          ai_credit_monthly?: number
          brand_color?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          logo_path?: string | null
          name: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          property_seq?: number
          settings?: Json
          slug: string
          trial_ends_at?: string | null
          trial_plan?: Database["public"]["Enums"]["plan_tier"] | null
          type: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Update: {
          ai_credit_balance?: number
          ai_credit_monthly?: number
          brand_color?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          logo_path?: string | null
          name?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          property_seq?: number
          settings?: Json
          slug?: string
          trial_ends_at?: string | null
          trial_plan?: Database["public"]["Enums"]["plan_tier"] | null
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_organization_id: string | null
          avatar_path: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          license_number: string | null
          monthly_commission_goal: number | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          active_organization_id?: string | null
          avatar_path?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          license_number?: string | null
          monthly_commission_goal?: number | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active_organization_id?: string | null
          avatar_path?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          license_number?: string | null
          monthly_commission_goal?: number | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_organization_id_fkey"
            columns: ["active_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address_visibility: Database["public"]["Enums"]["address_visibility"]
          area_sqm: number | null
          balcony_sqm: number | null
          bathrooms: number | null
          building_floors: number | null
          building_material: string | null
          city: string
          code: string
          common_cost_monthly: number | null
          condition: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          district: number | null
          energy_rating: Database["public"]["Enums"]["energy_rating"] | null
          floor: number | null
          floor_door: string | null
          garden_connected: boolean
          half_rooms: number
          has_elevator: boolean | null
          has_terrace: boolean
          heating: string | null
          highlights: string[]
          house_number: string | null
          id: string
          lat: number | null
          listed_at: string | null
          lng: number | null
          location: unknown
          lot_sqm: number | null
          mandate_expires_at: string | null
          mandate_start: string | null
          mandate_type: Database["public"]["Enums"]["mandate_type"] | null
          organization_id: string
          parking: string | null
          postal_code: string | null
          price: number
          price_per_sqm: number | null
          property_type: Database["public"]["Enums"]["property_type"]
          public_enabled: boolean
          public_slug: string | null
          responsible_agent_id: string | null
          rooms: number | null
          search_text: string | null
          seller_contact_id: string | null
          status: Database["public"]["Enums"]["property_status"]
          status_changed_at: string
          street: string | null
          subtype: string | null
          title: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          utilities_monthly: number | null
          view_count: number
          visibility: Database["public"]["Enums"]["record_visibility"]
          year_built: number | null
        }
        Insert: {
          address_visibility?: Database["public"]["Enums"]["address_visibility"]
          area_sqm?: number | null
          balcony_sqm?: number | null
          bathrooms?: number | null
          building_floors?: number | null
          building_material?: string | null
          city: string
          code: string
          common_cost_monthly?: number | null
          condition?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          district?: number | null
          energy_rating?: Database["public"]["Enums"]["energy_rating"] | null
          floor?: number | null
          floor_door?: string | null
          garden_connected?: boolean
          half_rooms?: number
          has_elevator?: boolean | null
          has_terrace?: boolean
          heating?: string | null
          highlights?: string[]
          house_number?: string | null
          id?: string
          lat?: number | null
          listed_at?: string | null
          lng?: number | null
          location?: unknown
          lot_sqm?: number | null
          mandate_expires_at?: string | null
          mandate_start?: string | null
          mandate_type?: Database["public"]["Enums"]["mandate_type"] | null
          organization_id: string
          parking?: string | null
          postal_code?: string | null
          price: number
          price_per_sqm?: number | null
          property_type: Database["public"]["Enums"]["property_type"]
          public_enabled?: boolean
          public_slug?: string | null
          responsible_agent_id?: string | null
          rooms?: number | null
          search_text?: string | null
          seller_contact_id?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          status_changed_at?: string
          street?: string | null
          subtype?: string | null
          title: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          utilities_monthly?: number | null
          view_count?: number
          visibility?: Database["public"]["Enums"]["record_visibility"]
          year_built?: number | null
        }
        Update: {
          address_visibility?: Database["public"]["Enums"]["address_visibility"]
          area_sqm?: number | null
          balcony_sqm?: number | null
          bathrooms?: number | null
          building_floors?: number | null
          building_material?: string | null
          city?: string
          code?: string
          common_cost_monthly?: number | null
          condition?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          district?: number | null
          energy_rating?: Database["public"]["Enums"]["energy_rating"] | null
          floor?: number | null
          floor_door?: string | null
          garden_connected?: boolean
          half_rooms?: number
          has_elevator?: boolean | null
          has_terrace?: boolean
          heating?: string | null
          highlights?: string[]
          house_number?: string | null
          id?: string
          lat?: number | null
          listed_at?: string | null
          lng?: number | null
          location?: unknown
          lot_sqm?: number | null
          mandate_expires_at?: string | null
          mandate_start?: string | null
          mandate_type?: Database["public"]["Enums"]["mandate_type"] | null
          organization_id?: string
          parking?: string | null
          postal_code?: string | null
          price?: number
          price_per_sqm?: number | null
          property_type?: Database["public"]["Enums"]["property_type"]
          public_enabled?: boolean
          public_slug?: string | null
          responsible_agent_id?: string | null
          rooms?: number | null
          search_text?: string | null
          seller_contact_id?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          status_changed_at?: string
          street?: string | null
          subtype?: string | null
          title?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          utilities_monthly?: number | null
          view_count?: number
          visibility?: Database["public"]["Enums"]["record_visibility"]
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_responsible_agent_id_fkey"
            columns: ["responsible_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_seller_contact_fk"
            columns: ["seller_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      property_commission_terms: {
        Row: {
          commission_fixed: number | null
          commission_pct: number | null
          notes: string | null
          organization_id: string
          property_id: string
          updated_at: string
        }
        Insert: {
          commission_fixed?: number | null
          commission_pct?: number | null
          notes?: string | null
          organization_id: string
          property_id: string
          updated_at?: string
        }
        Update: {
          commission_fixed?: number | null
          commission_pct?: number | null
          notes?: string | null
          organization_id?: string
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_commission_terms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_commission_terms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_media: {
        Row: {
          caption: string | null
          created_at: string
          external_url: string | null
          height: number | null
          id: string
          is_cover: boolean
          is_public: boolean
          is_virtually_staged: boolean
          kind: Database["public"]["Enums"]["media_kind"]
          organization_id: string
          property_id: string
          sort_order: number
          storage_path: string | null
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          external_url?: string | null
          height?: number | null
          id?: string
          is_cover?: boolean
          is_public?: boolean
          is_virtually_staged?: boolean
          kind?: Database["public"]["Enums"]["media_kind"]
          organization_id: string
          property_id: string
          sort_order?: number
          storage_path?: string | null
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          external_url?: string | null
          height?: number | null
          id?: string
          is_cover?: boolean
          is_public?: boolean
          is_virtually_staged?: boolean
          kind?: Database["public"]["Enums"]["media_kind"]
          organization_id?: string
          property_id?: string
          sort_order?: number
          storage_path?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_media_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_media_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_recommendations: {
        Row: {
          channel: string
          contact_id: string
          id: string
          organization_id: string
          property_id: string
          reaction: string | null
          sent_at: string
          sent_by: string | null
        }
        Insert: {
          channel?: string
          contact_id: string
          id?: string
          organization_id: string
          property_id: string
          reaction?: string | null
          sent_at?: string
          sent_by?: string | null
        }
        Update: {
          channel?: string
          contact_id?: string
          id?: string
          organization_id?: string
          property_id?: string
          reaction?: string | null
          sent_at?: string
          sent_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_recommendations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_recommendations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_recommendations_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      search_profiles: {
        Row: {
          active: boolean
          area: unknown
          area_max: number | null
          area_min: number | null
          cities: string[]
          contact_id: string
          created_at: string
          districts: number[]
          financing: string[]
          id: string
          mortgage_approved: boolean
          must_have: string[]
          name: string | null
          nice_to_have: string[]
          notes: string | null
          organization_id: string
          price_max: number | null
          price_min: number | null
          property_types: Database["public"]["Enums"]["property_type"][]
          rooms_min: number | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency"]
        }
        Insert: {
          active?: boolean
          area?: unknown
          area_max?: number | null
          area_min?: number | null
          cities?: string[]
          contact_id: string
          created_at?: string
          districts?: number[]
          financing?: string[]
          id?: string
          mortgage_approved?: boolean
          must_have?: string[]
          name?: string | null
          nice_to_have?: string[]
          notes?: string | null
          organization_id: string
          price_max?: number | null
          price_min?: number | null
          property_types?: Database["public"]["Enums"]["property_type"][]
          rooms_min?: number | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency"]
        }
        Update: {
          active?: boolean
          area?: unknown
          area_max?: number | null
          area_min?: number | null
          cities?: string[]
          contact_id?: string
          created_at?: string
          districts?: number[]
          financing?: string[]
          id?: string
          mortgage_approved?: boolean
          must_have?: string[]
          name?: string | null
          nice_to_have?: string[]
          notes?: string | null
          organization_id?: string
          price_max?: number | null
          price_min?: number | null
          property_types?: Database["public"]["Enums"]["property_type"][]
          rooms_min?: number | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency"]
        }
        Relationships: [
          {
            foreignKeyName: "search_profiles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      showings: {
        Row: {
          agent_id: string | null
          buyer_contact_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          ends_at: string | null
          feedback_rating: number | null
          feedback_requested_at: string | null
          feedback_text: string | null
          id: string
          notes: string | null
          organization_id: string
          property_id: string
          starts_at: string
          status: Database["public"]["Enums"]["showing_status"]
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          buyer_contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          ends_at?: string | null
          feedback_rating?: number | null
          feedback_requested_at?: string | null
          feedback_text?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          property_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["showing_status"]
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          buyer_contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          ends_at?: string | null
          feedback_rating?: number | null
          feedback_requested_at?: string | null
          feedback_text?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          property_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["showing_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "showings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showings_buyer_contact_id_fkey"
            columns: ["buyer_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showings_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          description: string | null
          due_at: string | null
          id: string
          organization_id: string
          priority: Database["public"]["Enums"]["task_priority"]
          property_id: string | null
          recurrence_rule: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          organization_id: string
          priority?: Database["public"]["Enums"]["task_priority"]
          property_id?: string | null
          recurrence_rule?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          organization_id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          property_id?: string | null
          recurrence_rule?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { p_org: string }; Returns: boolean }
      contact_directory: {
        Args: { p_limit?: number; p_org: string; p_query?: string }
        Returns: {
          full_name: string
          id: string
          is_mine: boolean
          owner_agent_id: string
          owner_name: string
          roles: Database["public"]["Enums"]["contact_role"][]
        }[]
      }
      convert_lead: {
        Args: { p_activity_title?: string; p_contact?: string; p_lead: string }
        Returns: string
      }
      create_organization: {
        Args: {
          p_name: string
          p_type: Database["public"]["Enums"]["org_type"]
        }
        Returns: string
      }
      find_duplicate_contacts: {
        Args: { p_email: string; p_org: string; p_phone: string }
        Returns: {
          full_name: string
          id: string
          match: string
          owner_agent_id: string
          owner_name: string
        }[]
      }
      get_public_property: { Args: { p_slug: string }; Returns: Json }
      my_commission_goal: { Args: never; Returns: number }
      set_property_cover: {
        Args: { p_media: string; p_property: string }
        Returns: undefined
      }
      submit_public_inquiry: {
        Args: {
          p_consent: boolean
          p_email: string
          p_message: string
          p_name: string
          p_phone: string
          p_slug: string
        }
        Returns: string
      }
      write_audit: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_org: string
        }
        Returns: undefined
      }
    }
    Enums: {
      activity_type:
        | "call"
        | "email"
        | "sms"
        | "note"
        | "showing"
        | "price_change"
        | "status_change"
        | "document"
        | "offer"
        | "lead"
        | "recommendation"
        | "task"
        | "listing"
      address_visibility: "exact" | "street" | "area"
      commission_status: "expected" | "earned" | "invoiced" | "paid"
      contact_role:
        | "seller"
        | "buyer"
        | "tenant"
        | "landlord"
        | "investor"
        | "lawyer"
        | "mortgage_broker"
        | "other"
      deal_side: "seller" | "buyer"
      deal_stage:
        | "acquisition"
        | "assessment"
        | "mandate_signed"
        | "listed"
        | "new"
        | "needs_assessment"
        | "showings"
        | "offer"
        | "financing"
        | "deposit"
        | "contract"
        | "closed"
      deal_status: "open" | "won" | "lost"
      document_kind:
        | "mandate_agreement"
        | "showing_sheet"
        | "reservation_precontract"
        | "pmt_form"
        | "handover_protocol"
        | "other"
      document_status: "draft" | "final" | "signed"
      energy_rating:
        | "AA++"
        | "AA+"
        | "AA"
        | "BB"
        | "CC"
        | "DD"
        | "EE"
        | "FF"
        | "GG"
        | "HH"
        | "II"
        | "JJ"
      event_kind: "showing" | "meeting" | "signing" | "call" | "other"
      lead_source:
        | "portal"
        | "website"
        | "facebook"
        | "phone"
        | "referral"
        | "manual"
        | "public_page"
      lead_status:
        | "new"
        | "read"
        | "contacted"
        | "converted"
        | "archived"
        | "spam"
      mandate_type: "exclusive" | "non_exclusive"
      media_kind: "photo" | "floorplan" | "video" | "tour360"
      member_role: "owner" | "agent" | "assistant"
      member_status: "active" | "invited" | "disabled"
      offer_kind: "offer" | "counter"
      offer_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "withdrawn"
        | "expired"
      org_type: "individual" | "office"
      plan_tier: "start" | "pro" | "pro_ai" | "office"
      pmt_status: "not_started" | "in_progress" | "completed" | "expired"
      property_status:
        | "draft"
        | "active"
        | "under_offer"
        | "reserved"
        | "sold"
        | "rented"
        | "withdrawn"
        | "expired"
      property_type:
        | "flat"
        | "house"
        | "plot"
        | "office"
        | "retail"
        | "holiday_home"
      record_visibility: "office" | "private"
      risk_level: "low" | "medium" | "high"
      showing_status: "scheduled" | "completed" | "cancelled" | "no_show"
      split_role: "listing" | "selling" | "referral"
      task_priority: "low" | "normal" | "high"
      task_status: "open" | "done"
      transaction_type: "sale" | "rent"
      urgency: "low" | "medium" | "high"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      activity_type: [
        "call",
        "email",
        "sms",
        "note",
        "showing",
        "price_change",
        "status_change",
        "document",
        "offer",
        "lead",
        "recommendation",
        "task",
        "listing",
      ],
      address_visibility: ["exact", "street", "area"],
      commission_status: ["expected", "earned", "invoiced", "paid"],
      contact_role: [
        "seller",
        "buyer",
        "tenant",
        "landlord",
        "investor",
        "lawyer",
        "mortgage_broker",
        "other",
      ],
      deal_side: ["seller", "buyer"],
      deal_stage: [
        "acquisition",
        "assessment",
        "mandate_signed",
        "listed",
        "new",
        "needs_assessment",
        "showings",
        "offer",
        "financing",
        "deposit",
        "contract",
        "closed",
      ],
      deal_status: ["open", "won", "lost"],
      document_kind: [
        "mandate_agreement",
        "showing_sheet",
        "reservation_precontract",
        "pmt_form",
        "handover_protocol",
        "other",
      ],
      document_status: ["draft", "final", "signed"],
      energy_rating: [
        "AA++",
        "AA+",
        "AA",
        "BB",
        "CC",
        "DD",
        "EE",
        "FF",
        "GG",
        "HH",
        "II",
        "JJ",
      ],
      event_kind: ["showing", "meeting", "signing", "call", "other"],
      lead_source: [
        "portal",
        "website",
        "facebook",
        "phone",
        "referral",
        "manual",
        "public_page",
      ],
      lead_status: [
        "new",
        "read",
        "contacted",
        "converted",
        "archived",
        "spam",
      ],
      mandate_type: ["exclusive", "non_exclusive"],
      media_kind: ["photo", "floorplan", "video", "tour360"],
      member_role: ["owner", "agent", "assistant"],
      member_status: ["active", "invited", "disabled"],
      offer_kind: ["offer", "counter"],
      offer_status: ["pending", "accepted", "rejected", "withdrawn", "expired"],
      org_type: ["individual", "office"],
      plan_tier: ["start", "pro", "pro_ai", "office"],
      pmt_status: ["not_started", "in_progress", "completed", "expired"],
      property_status: [
        "draft",
        "active",
        "under_offer",
        "reserved",
        "sold",
        "rented",
        "withdrawn",
        "expired",
      ],
      property_type: [
        "flat",
        "house",
        "plot",
        "office",
        "retail",
        "holiday_home",
      ],
      record_visibility: ["office", "private"],
      risk_level: ["low", "medium", "high"],
      showing_status: ["scheduled", "completed", "cancelled", "no_show"],
      split_role: ["listing", "selling", "referral"],
      task_priority: ["low", "normal", "high"],
      task_status: ["open", "done"],
      transaction_type: ["sale", "rent"],
      urgency: ["low", "medium", "high"],
    },
  },
} as const
