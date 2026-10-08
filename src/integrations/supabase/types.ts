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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_profiles: {
        Row: {
          available: boolean
          created_at: string
          display_name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          display_name?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          available?: boolean
          created_at?: string
          display_name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      callback_requests: {
        Row: {
          agent_id: string | null
          created_at: string
          customer_name: string
          id: string
          last_error: string | null
          phone: string
          reason: string | null
          session_id: string | null
          status: string
          twilio_call_sid: string | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          last_error?: string | null
          phone: string
          reason?: string | null
          session_id?: string | null
          status?: string
          twilio_call_sid?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          last_error?: string | null
          phone?: string
          reason?: string | null
          session_id?: string | null
          status?: string
          twilio_call_sid?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          city: string | null
          created_at: string
          email: string | null
          id: string
          lifetime_value: number
          name: string
          notes: string | null
          phone: string
          tier: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lifetime_value?: number
          name: string
          notes?: string | null
          phone: string
          tier?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lifetime_value?: number
          name?: string
          notes?: string | null
          phone?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      handoff_sessions: {
        Row: {
          actions: Json
          agent_name: string | null
          channel: string
          connected_at: string | null
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          ended_at: string | null
          failures: Json
          id: string
          issue: string | null
          order_id: string | null
          order_status: string | null
          orders: Json
          sentiment: string
          state: string
          transcript: Json
          twilio_call_sid: string | null
          updated_at: string
        }
        Insert: {
          actions?: Json
          agent_name?: string | null
          channel?: string
          connected_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          ended_at?: string | null
          failures?: Json
          id?: string
          issue?: string | null
          order_id?: string | null
          order_status?: string | null
          orders?: Json
          sentiment?: string
          state?: string
          transcript?: Json
          twilio_call_sid?: string | null
          updated_at?: string
        }
        Update: {
          actions?: Json
          agent_name?: string | null
          channel?: string
          connected_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          ended_at?: string | null
          failures?: Json
          id?: string
          issue?: string | null
          order_id?: string | null
          order_status?: string | null
          orders?: Json
          sentiment?: string
          state?: string
          transcript?: Json
          twilio_call_sid?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      phone_calls: {
        Row: {
          agent_id: string | null
          callback_id: string | null
          created_at: string
          customer_id: string | null
          direction: string
          duration_seconds: number | null
          from_number: string | null
          id: string
          kind: string
          session_id: string | null
          status: string
          to_number: string | null
          twilio_call_sid: string | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          callback_id?: string | null
          created_at?: string
          customer_id?: string | null
          direction: string
          duration_seconds?: number | null
          from_number?: string | null
          id?: string
          kind?: string
          session_id?: string | null
          status?: string
          to_number?: string | null
          twilio_call_sid?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          callback_id?: string | null
          created_at?: string
          customer_id?: string | null
          direction?: string
          duration_seconds?: number | null
          from_number?: string | null
          id?: string
          kind?: string
          session_id?: string | null
          status?: string
          to_number?: string | null
          twilio_call_sid?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
    }
    Enums: {
      app_role: "admin" | "agent"
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
      app_role: ["admin", "agent"],
    },
  },
} as const
