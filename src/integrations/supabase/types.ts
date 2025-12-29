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
      alumni: {
        Row: {
          city: string | null
          company: string
          created_at: string
          graduation_year: number
          id: string
          linkedin_url: string | null
          name: string
          surname: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          company: string
          created_at?: string
          graduation_year: number
          id?: string
          linkedin_url?: string | null
          name: string
          surname: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          company?: string
          created_at?: string
          graduation_year?: number
          id?: string
          linkedin_url?: string | null
          name?: string
          surname?: string
          updated_at?: string
        }
        Relationships: []
      }
      application_settings: {
        Row: {
          applications_open: boolean
          apply_form_url: string
          id: string
          semester_label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          applications_open?: boolean
          apply_form_url?: string
          id?: string
          semester_label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          applications_open?: boolean
          apply_form_url?: string
          id?: string
          semester_label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      archive_files: {
        Row: {
          created_at: string
          date: string
          description: string | null
          division: string
          file_url: string
          fund: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          division: string
          file_url: string
          fund?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          division?: string
          file_url?: string
          fund?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          date: string
          description: string | null
          guest: string[] | null
          id: string
          moderator: string | null
          place: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          guest?: string[] | null
          id?: string
          moderator?: string | null
          place: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          guest?: string[] | null
          id?: string
          moderator?: string | null
          place?: string
          title?: string
          updated_at?: string
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
      team_members: {
        Row: {
          created_at: string
          display_order: number
          division: Database["public"]["Enums"]["team_division"] | null
          fund: Database["public"]["Enums"]["team_fund"] | null
          id: string
          is_board: boolean
          linkedin_url: string | null
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
          name?: string
          photo_url?: string | null
          position?: Database["public"]["Enums"]["team_position"]
          surname?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
      ],
    },
  },
} as const
