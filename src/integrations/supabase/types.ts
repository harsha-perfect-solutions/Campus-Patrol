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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Relationships: []
      }
      class_slots: {
        Row: {
          code: string
          day_of_week: number
          department: string
          end_time: string
          faculty_id: string | null
          faculty_name: string
          id: string
          room: string
          section: string
          start_time: string
          subject: string
          year: string
        }
        Insert: {
          code: string
          day_of_week: number
          department: string
          end_time: string
          faculty_id?: string | null
          faculty_name: string
          id?: string
          room: string
          section: string
          start_time: string
          subject: string
          year: string
        }
        Update: {
          code?: string
          day_of_week?: number
          department?: string
          end_time?: string
          faculty_id?: string | null
          faculty_name?: string
          id?: string
          room?: string
          section?: string
          start_time?: string
          subject?: string
          year?: string
        }
        Relationships: []
      }
      explanations: {
        Row: {
          body: string
          evidence_url: string | null
          id: string
          student_code: string
          submitted_at: string
          violation_id: string
        }
        Insert: {
          body: string
          evidence_url?: string | null
          id?: string
          student_code: string
          submitted_at?: string
          violation_id: string
        }
        Update: {
          body?: string
          evidence_url?: string | null
          id?: string
          student_code?: string
          submitted_at?: string
          violation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "explanations_violation_id_fkey"
            columns: ["violation_id"]
            isOneToOne: false
            referencedRelation: "violations"
            referencedColumns: ["id"]
          },
        ]
      }
      movement_permissions: {
        Row: {
          created_at: string
          details: string | null
          id: string
          issued_by: string
          on_date: string
          reason_type: string
          status: Database["public"]["Enums"]["permission_status"]
          student_code: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          issued_by: string
          on_date?: string
          reason_type: string
          status?: Database["public"]["Enums"]["permission_status"]
          student_code: string
          valid_from: string
          valid_until: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          issued_by?: string
          on_date?: string
          reason_type?: string
          status?: Database["public"]["Enums"]["permission_status"]
          student_code?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "movement_permissions_student_code_fkey"
            columns: ["student_code"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_code"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          detail: string
          id: string
          read: boolean
          title: string
          tone: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string
          id?: string
          read?: boolean
          title: string
          tone?: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string
          id?: string
          read?: boolean
          title?: string
          tone?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string
          email: string
          full_name: string
          id: string
          staff_code: string | null
          student_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string
          email?: string
          full_name?: string
          id: string
          staff_code?: string | null
          student_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string
          email?: string
          full_name?: string
          id?: string
          staff_code?: string | null
          student_code?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          created_at: string
          department: string
          name: string
          photo_url: string | null
          section: string
          semester: number
          status: string
          student_code: string
          year: string
        }
        Insert: {
          created_at?: string
          department: string
          name: string
          photo_url?: string | null
          section: string
          semester?: number
          status?: string
          student_code: string
          year: string
        }
        Update: {
          created_at?: string
          department?: string
          name?: string
          photo_url?: string | null
          section?: string
          semester?: number
          status?: string
          student_code?: string
          year?: string
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
      violations: {
        Row: {
          class_subject: string | null
          class_time: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          department: string
          evidence_url: string | null
          explanation_deadline: string
          id: string
          incident_at: string
          location_found: string
          reference: string
          remarks: string
          reported_by: string
          reported_by_name: string
          room: string | null
          section: string
          semester: number
          status: Database["public"]["Enums"]["violation_status"]
          student_code: string
          student_name: string
          year: string
        }
        Insert: {
          class_subject?: string | null
          class_time?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          department: string
          evidence_url?: string | null
          explanation_deadline?: string
          id?: string
          incident_at?: string
          location_found: string
          reference: string
          remarks?: string
          reported_by: string
          reported_by_name: string
          room?: string | null
          section: string
          semester: number
          status?: Database["public"]["Enums"]["violation_status"]
          student_code: string
          student_name: string
          year: string
        }
        Update: {
          class_subject?: string | null
          class_time?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          department?: string
          evidence_url?: string | null
          explanation_deadline?: string
          id?: string
          incident_at?: string
          location_found?: string
          reference?: string
          remarks?: string
          reported_by?: string
          reported_by_name?: string
          room?: string | null
          section?: string
          semester?: number
          status?: Database["public"]["Enums"]["violation_status"]
          student_code?: string
          student_name?: string
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "violations_student_code_fkey"
            columns: ["student_code"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_code"]
          },
        ]
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
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      my_student_code: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "faculty" | "student" | "hod" | "admin"
      permission_status: "pending" | "approved" | "rejected"
      violation_status:
        | "reported"
        | "notified"
        | "awaiting_explanation"
        | "explanation_submitted"
        | "under_review"
        | "exonerated"
        | "warned"
        | "escalated"
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
      app_role: ["faculty", "student", "hod", "admin"],
      permission_status: ["pending", "approved", "rejected"],
      violation_status: [
        "reported",
        "notified",
        "awaiting_explanation",
        "explanation_submitted",
        "under_review",
        "exonerated",
        "warned",
        "escalated",
      ],
    },
  },
} as const
