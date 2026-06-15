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
      exam_sessions: {
        Row: {
          answers: Json | null
          completed_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          question_count: number
          questions: Json | null
          score: number
          source_session_ids: Json
          started_at: string | null
          status: string
          subjects: Json
          title: string
          total: number
          updated_at: string
          user_id: string
          weak_points: Json | null
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          question_count?: number
          questions?: Json | null
          score?: number
          source_session_ids?: Json
          started_at?: string | null
          status?: string
          subjects?: Json
          title?: string
          total?: number
          updated_at?: string
          user_id: string
          weak_points?: Json | null
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          question_count?: number
          questions?: Json | null
          score?: number
          source_session_ids?: Json
          started_at?: string | null
          status?: string
          subjects?: Json
          title?: string
          total?: number
          updated_at?: string
          user_id?: string
          weak_points?: Json | null
        }
        Relationships: []
      }
      exercise_attempts: {
        Row: {
          created_at: string
          exercise_id: string
          feedback: string | null
          id: string
          is_correct: boolean
          score: number
          submission_image_url: string | null
          submission_text: string | null
          submission_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          feedback?: string | null
          id?: string
          is_correct?: boolean
          score?: number
          submission_image_url?: string | null
          submission_text?: string | null
          submission_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          feedback?: string | null
          id?: string
          is_correct?: boolean
          score?: number
          submission_image_url?: string | null
          submission_text?: string | null
          submission_type?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_solves: {
        Row: {
          created_at: string
          id: string
          image_url: string
          solution: Json | null
          status: string
          subject: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          solution?: Json | null
          status?: string
          subject?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          solution?: Json | null
          status?: string
          subject?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          answer: string
          created_at: string
          difficulty: number
          ease_factor: number
          id: string
          interval_days: number
          last_reviewed_at: string | null
          next_review: string
          question: string
          repetitions: number
          session_id: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          difficulty?: number
          ease_factor?: number
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          next_review?: string
          question: string
          repetitions?: number
          session_id?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          difficulty?: number
          ease_factor?: number
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          next_review?: string
          question?: string
          repetitions?: number
          session_id?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "learning_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_sessions: {
        Row: {
          analysis: Json | null
          created_at: string
          id: string
          image_url: string
          status: string
          subject: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          created_at?: string
          id?: string
          image_url: string
          status?: string
          subject?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis?: Json | null
          created_at?: string
          id?: string
          image_url?: string
          status?: string
          subject?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mindmaps: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          session_id: string | null
          source_text: string | null
          status: string
          subject: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          session_id?: string | null
          source_text?: string | null
          status?: string
          subject?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          session_id?: string | null
          source_text?: string | null
          status?: string
          subject?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      oracle_chats: {
        Row: {
          created_at: string
          id: string
          messages: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          analyses_count: number
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          daily_oracle_count: number
          daily_oracle_date: string
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          monthly_audio_count: number
          monthly_audio_month: string
          monthly_uploads_count: number
          monthly_uploads_month: string
          onboarding_completed: boolean
          plan: string
          school: string | null
          stripe_customer_id: string | null
          study_level: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analyses_count?: number
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          daily_oracle_count?: number
          daily_oracle_date?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          monthly_audio_count?: number
          monthly_audio_month?: string
          monthly_uploads_count?: number
          monthly_uploads_month?: string
          onboarding_completed?: boolean
          plan?: string
          school?: string | null
          stripe_customer_id?: string | null
          study_level?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analyses_count?: number
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          daily_oracle_count?: number
          daily_oracle_date?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          monthly_audio_count?: number
          monthly_audio_month?: string
          monthly_uploads_count?: number
          monthly_uploads_month?: string
          onboarding_completed?: boolean
          plan?: string
          school?: string | null
          stripe_customer_id?: string | null
          study_level?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          created_at: string
          id: string
          score: number
          session_id: string
          total: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          id?: string
          score?: number
          session_id: string
          total?: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          created_at?: string
          id?: string
          score?: number
          session_id?: string
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "learning_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_exercises: {
        Row: {
          created_at: string
          expected_answer: string | null
          hints: Json | null
          id: string
          level: number
          session_id: string
          statement: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expected_answer?: string | null
          hints?: Json | null
          id?: string
          level?: number
          session_id: string
          statement: string
          title?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expected_answer?: string | null
          hints?: Json | null
          id?: string
          level?: number
          session_id?: string
          statement?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
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
      consume_audio_quota: {
        Args: { p_limit: number }
        Returns: {
          allowed: boolean
          quota: number
          used: number
        }[]
      }
      consume_oracle_quota: {
        Args: { p_limit: number }
        Returns: {
          allowed: boolean
          quota: number
          used: number
        }[]
      }
      consume_upload_quota: {
        Args: { p_limit: number }
        Returns: {
          allowed: boolean
          quota: number
          used: number
        }[]
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
