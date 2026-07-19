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
      active_contracts: {
        Row: {
          connector_id: string
          created_at: string
          end_date: string
          id: string
          owner_id: string
          start_date: string
          task_id: string
        }
        Insert: {
          connector_id: string
          created_at?: string
          end_date: string
          id?: string
          owner_id: string
          start_date: string
          task_id: string
        }
        Update: {
          connector_id?: string
          created_at?: string
          end_date?: string
          id?: string
          owner_id?: string
          start_date?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_contracts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          app_version: string
          features: Json
          id: number
          updated_at: string
        }
        Insert: {
          app_version?: string
          features?: Json
          id?: number
          updated_at?: string
        }
        Update: {
          app_version?: string
          features?: Json
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          connected_user_id: string
          created_at: string
          id: string
          requester_id: string
        }
        Insert: {
          connected_user_id: string
          created_at?: string
          id?: string
          requester_id: string
        }
        Update: {
          connected_user_id?: string
          created_at?: string
          id?: string
          requester_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          email_verified: boolean
          full_name: string | null
          id: string
          invite_code: string | null
          max_connectors: number
          mobile: string | null
          privacy_show_tasks: boolean
          theme: string
          tier: string
          timer_completion_count: number
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          email_verified?: boolean
          full_name?: string | null
          id: string
          invite_code?: string | null
          max_connectors?: number
          mobile?: string | null
          privacy_show_tasks?: boolean
          theme?: string
          tier?: string
          timer_completion_count?: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          email_verified?: boolean
          full_name?: string | null
          id?: string
          invite_code?: string | null
          max_connectors?: number
          mobile?: string | null
          privacy_show_tasks?: boolean
          theme?: string
          tier?: string
          timer_completion_count?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      subscription_requests: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          status: string
          tier: string
          updated_at: string
          user_id: string
          utr: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          tier: string
          updated_at?: string
          user_id: string
          utr: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string
          utr?: string
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          created_at: string
          date: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_permissions: {
        Row: {
          connector_id: string
          created_at: string
          id: string
          owner_id: string
          task_id: string
        }
        Insert: {
          connector_id: string
          created_at?: string
          id?: string
          owner_id: string
          task_id: string
        }
        Update: {
          connector_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_permissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          id: string
          span_days: number
          start_date: string
          status: string
          text: string
          transfer_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          span_days?: number
          start_date: string
          status?: string
          text: string
          transfer_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          span_days?: number
          start_date?: string
          status?: string
          text?: string
          transfer_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      generate_invite_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_by_invite_code: { Args: { _code: string }; Returns: string }
      task_shared_with: {
        Args: { _task_id: string; _viewer: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
