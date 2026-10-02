export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      attendance: {
        Row: {
          edited_after: boolean;
          enrollment_id: string;
          id: string;
          late_marked: boolean;
          lesson_id: string;
          marked_at: string;
          marked_by: string | null;
          note: string | null;
          organization_id: string;
          status: Database["public"]["Enums"]["attendance_status"];
        };
        Insert: {
          edited_after?: boolean;
          enrollment_id: string;
          id?: string;
          late_marked?: boolean;
          lesson_id: string;
          marked_at?: string;
          marked_by?: string | null;
          note?: string | null;
          organization_id: string;
          status: Database["public"]["Enums"]["attendance_status"];
        };
        Update: {
          edited_after?: boolean;
          enrollment_id?: string;
          id?: string;
          late_marked?: boolean;
          lesson_id?: string;
          marked_at?: string;
          marked_by?: string | null;
          note?: string | null;
          organization_id?: string;
          status?: Database["public"]["Enums"]["attendance_status"];
        };
        Relationships: [
          {
            foreignKeyName: "attendance_enrollment_id_fkey";
            columns: ["enrollment_id"];
            isOneToOne: false;
            referencedRelation: "enrollments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_marked_by_fkey";
            columns: ["marked_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          diff: Json | null;
          entity: string;
          entity_id: string | null;
          id: number;
          organization_id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          diff?: Json | null;
          entity: string;
          entity_id?: string | null;
          id?: never;
          organization_id: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          diff?: Json | null;
          entity?: string;
          entity_id?: string | null;
          id?: never;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      branches: {
        Row: {
          address: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          organization_id: string;
          phone: string | null;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          organization_id: string;
          phone?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          organization_id?: string;
          phone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "branches_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      cash_handovers: {
        Row: {
          amount: number;
          branch_id: string;
          created_at: string;
          from_staff_id: string;
          id: string;
          method_id: string;
          note: string | null;
          organization_id: string;
          to_staff_id: string | null;
        };
        Insert: {
          amount: number;
          branch_id: string;
          created_at?: string;
          from_staff_id: string;
          id?: string;
          method_id: string;
          note?: string | null;
          organization_id: string;
          to_staff_id?: string | null;
        };
        Update: {
          amount?: number;
          branch_id?: string;
          created_at?: string;
          from_staff_id?: string;
          id?: string;
          method_id?: string;
          note?: string | null;
          organization_id?: string;
          to_staff_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cash_handovers_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_handovers_from_staff_id_fkey";
            columns: ["from_staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_handovers_method_id_fkey";
            columns: ["method_id"];
            isOneToOne: false;
            referencedRelation: "payment_methods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_handovers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_handovers_to_staff_id_fkey";
            columns: ["to_staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          id: string;
          is_active: boolean;
          lesson_minutes: number | null;
          monthly_price: number;
          name: string;
          organization_id: string;
        };
        Insert: {
          id?: string;
          is_active?: boolean;
          lesson_minutes?: number | null;
          monthly_price: number;
          name: string;
          organization_id: string;
        };
        Update: {
          id?: string;
          is_active?: boolean;
          lesson_minutes?: number | null;
          monthly_price?: number;
          name?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      discounts: {
        Row: {
          amount: number | null;
          enrollment_id: string;
          id: string;
          organization_id: string;
          percent: number | null;
          reason: string | null;
          valid_from: string;
          valid_to: string | null;
        };
        Insert: {
          amount?: number | null;
          enrollment_id: string;
          id?: string;
          organization_id: string;
          percent?: number | null;
          reason?: string | null;
          valid_from: string;
          valid_to?: string | null;
        };
        Update: {
          amount?: number | null;
          enrollment_id?: string;
          id?: string;
          organization_id?: string;
          percent?: number | null;
          reason?: string | null;
          valid_from?: string;
          valid_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "discounts_enrollment_id_fkey";
            columns: ["enrollment_id"];
            isOneToOne: false;
            referencedRelation: "enrollments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discounts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      enrollments: {
        Row: {
          activated_at: string | null;
          created_at: string;
          group_id: string;
          id: string;
          joined_at: string;
          leave_reason_id: string | null;
          left_at: string | null;
          organization_id: string;
          price_override: number | null;
          status: Database["public"]["Enums"]["enrollment_status"];
          student_id: string;
        };
        Insert: {
          activated_at?: string | null;
          created_at?: string;
          group_id: string;
          id?: string;
          joined_at?: string;
          leave_reason_id?: string | null;
          left_at?: string | null;
          organization_id: string;
          price_override?: number | null;
          status?: Database["public"]["Enums"]["enrollment_status"];
          student_id: string;
        };
        Update: {
          activated_at?: string | null;
          created_at?: string;
          group_id?: string;
          id?: string;
          joined_at?: string;
          leave_reason_id?: string | null;
          left_at?: string | null;
          organization_id?: string;
          price_override?: number | null;
          status?: Database["public"]["Enums"]["enrollment_status"];
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrollments_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_leave_reason_id_fkey";
            columns: ["leave_reason_id"];
            isOneToOne: false;
            referencedRelation: "reasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "student_balances";
            referencedColumns: ["student_id"];
          },
          {
            foreignKeyName: "enrollments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_categories: {
        Row: {
          id: string;
          is_active: boolean;
          kind: Database["public"]["Enums"]["expense_kind"];
          name: string;
          organization_id: string;
        };
        Insert: {
          id?: string;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["expense_kind"];
          name: string;
          organization_id: string;
        };
        Update: {
          id?: string;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["expense_kind"];
          name?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expense_categories_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          amount: number;
          branch_id: string;
          category_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          method_id: string | null;
          note: string | null;
          organization_id: string;
          paid_at: string;
          recipient: string | null;
        };
        Insert: {
          amount: number;
          branch_id: string;
          category_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          method_id?: string | null;
          note?: string | null;
          organization_id: string;
          paid_at?: string;
          recipient?: string | null;
        };
        Update: {
          amount?: number;
          branch_id?: string;
          category_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          method_id?: string | null;
          note?: string | null;
          organization_id?: string;
          paid_at?: string;
          recipient?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "expense_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_method_id_fkey";
            columns: ["method_id"];
            isOneToOne: false;
            referencedRelation: "payment_methods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      freezes: {
        Row: {
          created_at: string;
          created_by: string | null;
          date_from: string;
          date_to: string;
          enrollment_id: string;
          id: string;
          organization_id: string;
          reason_id: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          date_from: string;
          date_to: string;
          enrollment_id: string;
          id?: string;
          organization_id: string;
          reason_id?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          date_from?: string;
          date_to?: string;
          enrollment_id?: string;
          id?: string;
          organization_id?: string;
          reason_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "freezes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "freezes_enrollment_id_fkey";
            columns: ["enrollment_id"];
            isOneToOne: false;
            referencedRelation: "enrollments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "freezes_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "freezes_reason_id_fkey";
            columns: ["reason_id"];
            isOneToOne: false;
            referencedRelation: "reasons";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          branch_id: string;
          course_id: string;
          created_at: string;
          end_date: string | null;
          end_time: string;
          id: string;
          is_active: boolean;
          monthly_price: number;
          name: string;
          organization_id: string;
          room_id: string | null;
          start_date: string;
          start_time: string;
          teacher_id: string | null;
          weekdays: number[];
        };
        Insert: {
          branch_id: string;
          course_id: string;
          created_at?: string;
          end_date?: string | null;
          end_time: string;
          id?: string;
          is_active?: boolean;
          monthly_price: number;
          name: string;
          organization_id: string;
          room_id?: string | null;
          start_date: string;
          start_time: string;
          teacher_id?: string | null;
          weekdays: number[];
        };
        Update: {
          branch_id?: string;
          course_id?: string;
          created_at?: string;
          end_date?: string | null;
          end_time?: string;
          id?: string;
          is_active?: boolean;
          monthly_price?: number;
          name?: string;
          organization_id?: string;
          room_id?: string | null;
          start_date?: string;
          start_time?: string;
          teacher_id?: string | null;
          weekdays?: number[];
        };
        Relationships: [
          {
            foreignKeyName: "groups_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "groups_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "groups_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "groups_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "groups_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      holidays: {
        Row: {
          branch_id: string | null;
          created_at: string;
          created_by: string | null;
          date: string;
          id: string;
          organization_id: string;
          reason: string;
        };
        Insert: {
          branch_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          date: string;
          id?: string;
          organization_id: string;
          reason: string;
        };
        Update: {
          branch_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          date?: string;
          id?: string;
          organization_id?: string;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: "holidays_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "holidays_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "holidays_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_activities: {
        Row: {
          body: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          lead_id: string;
          organization_id: string;
          type: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          lead_id: string;
          organization_id: string;
          type: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          lead_id?: string;
          organization_id?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_activities_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_activities_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_activities_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          assigned_to: string | null;
          branch_id: string | null;
          course_id: string | null;
          created_at: string;
          full_name: string;
          id: string;
          lost_reason_id: string | null;
          next_action_at: string | null;
          organization_id: string;
          phone: string | null;
          pipeline_id: string;
          source: string;
          stage_changed_at: string;
          stage_id: string;
          student_id: string | null;
        };
        Insert: {
          assigned_to?: string | null;
          branch_id?: string | null;
          course_id?: string | null;
          created_at?: string;
          full_name: string;
          id?: string;
          lost_reason_id?: string | null;
          next_action_at?: string | null;
          organization_id: string;
          phone?: string | null;
          pipeline_id: string;
          source?: string;
          stage_changed_at?: string;
          stage_id: string;
          student_id?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          branch_id?: string | null;
          course_id?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          lost_reason_id?: string | null;
          next_action_at?: string | null;
          organization_id?: string;
          phone?: string | null;
          pipeline_id?: string;
          source?: string;
          stage_changed_at?: string;
          stage_id?: string;
          student_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_lost_reason_id_fkey";
            columns: ["lost_reason_id"];
            isOneToOne: false;
            referencedRelation: "reasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_pipeline_id_fkey";
            columns: ["pipeline_id"];
            isOneToOne: false;
            referencedRelation: "pipelines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_stages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "student_balances";
            referencedColumns: ["student_id"];
          },
          {
            foreignKeyName: "leads_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          cancel_holiday_id: string | null;
          cancel_reason: string | null;
          date: string;
          end_time: string;
          group_id: string;
          homework: string | null;
          id: string;
          organization_id: string;
          start_time: string;
          status: Database["public"]["Enums"]["lesson_status"];
          topic: string | null;
        };
        Insert: {
          cancel_holiday_id?: string | null;
          cancel_reason?: string | null;
          date: string;
          end_time: string;
          group_id: string;
          homework?: string | null;
          id?: string;
          organization_id: string;
          start_time: string;
          status?: Database["public"]["Enums"]["lesson_status"];
          topic?: string | null;
        };
        Update: {
          cancel_holiday_id?: string | null;
          cancel_reason?: string | null;
          date?: string;
          end_time?: string;
          group_id?: string;
          homework?: string | null;
          id?: string;
          organization_id?: string;
          start_time?: string;
          status?: Database["public"]["Enums"]["lesson_status"];
          topic?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_cancel_holiday_id_fkey";
            columns: ["cancel_holiday_id"];
            isOneToOne: false;
            referencedRelation: "holidays";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lessons_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lessons_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      message_log: {
        Row: {
          body: string;
          channel: string;
          created_at: string;
          error: string | null;
          id: string;
          organization_id: string;
          recipient: string;
          status: string;
          student_id: string | null;
          template: string | null;
        };
        Insert: {
          body: string;
          channel: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          organization_id: string;
          recipient: string;
          status?: string;
          student_id?: string | null;
          template?: string | null;
        };
        Update: {
          body?: string;
          channel?: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          organization_id?: string;
          recipient?: string;
          status?: string;
          student_id?: string | null;
          template?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "message_log_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_log_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "student_balances";
            referencedColumns: ["student_id"];
          },
          {
            foreignKeyName: "message_log_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          logo_url: string | null;
          name: string;
          plan: string;
          primary_color: string | null;
          settings: NonNullable<Json>;
          slug: string;
          status: Database["public"]["Enums"]["org_status"];
          timezone: string;
          trial_ends_at: string | null;
          work_end: string | null;
          work_start: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
          plan?: string;
          primary_color?: string | null;
          settings?: NonNullable<Json>;
          slug: string;
          status?: Database["public"]["Enums"]["org_status"];
          timezone?: string;
          trial_ends_at?: string | null;
          work_end?: string | null;
          work_start?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
          plan?: string;
          primary_color?: string | null;
          settings?: NonNullable<Json>;
          slug?: string;
          status?: Database["public"]["Enums"]["org_status"];
          timezone?: string;
          trial_ends_at?: string | null;
          work_end?: string | null;
          work_start?: string | null;
        };
        Relationships: [];
      };
      payment_methods: {
        Row: {
          id: string;
          is_active: boolean;
          kind: Database["public"]["Enums"]["method_kind"];
          name: string;
          organization_id: string;
          parent_id: string | null;
        };
        Insert: {
          id?: string;
          is_active?: boolean;
          kind: Database["public"]["Enums"]["method_kind"];
          name: string;
          organization_id: string;
          parent_id?: string | null;
        };
        Update: {
          id?: string;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["method_kind"];
          name?: string;
          organization_id?: string;
          parent_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payment_methods_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_methods_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "payment_methods";
            referencedColumns: ["id"];
          },
        ];
      };
      pipeline_stages: {
        Row: {
          id: string;
          is_lost: boolean;
          is_won: boolean;
          name: string;
          organization_id: string;
          pipeline_id: string;
          sort: number;
        };
        Insert: {
          id?: string;
          is_lost?: boolean;
          is_won?: boolean;
          name: string;
          organization_id: string;
          pipeline_id: string;
          sort: number;
        };
        Update: {
          id?: string;
          is_lost?: boolean;
          is_won?: boolean;
          name?: string;
          organization_id?: string;
          pipeline_id?: string;
          sort?: number;
        };
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey";
            columns: ["pipeline_id"];
            isOneToOne: false;
            referencedRelation: "pipelines";
            referencedColumns: ["id"];
          },
        ];
      };
      pipelines: {
        Row: {
          id: string;
          name: string;
          organization_id: string;
          sort: number;
        };
        Insert: {
          id?: string;
          name: string;
          organization_id: string;
          sort?: number;
        };
        Update: {
          id?: string;
          name?: string;
          organization_id?: string;
          sort?: number;
        };
        Relationships: [
          {
            foreignKeyName: "pipelines_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          is_super_admin: boolean;
          must_change_password: boolean;
          phone: string | null;
          telegram_user_id: number | null;
        };
        Insert: {
          created_at?: string;
          full_name: string;
          id: string;
          is_super_admin?: boolean;
          must_change_password?: boolean;
          phone?: string | null;
          telegram_user_id?: number | null;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          is_super_admin?: boolean;
          must_change_password?: boolean;
          phone?: string | null;
          telegram_user_id?: number | null;
        };
        Relationships: [];
      };
      reasons: {
        Row: {
          id: string;
          is_active: boolean;
          kind: Database["public"]["Enums"]["reason_kind"];
          name: string;
          organization_id: string;
        };
        Insert: {
          id?: string;
          is_active?: boolean;
          kind: Database["public"]["Enums"]["reason_kind"];
          name: string;
          organization_id: string;
        };
        Update: {
          id?: string;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["reason_kind"];
          name?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reasons_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          description: string | null;
          id: string;
          is_system: boolean;
          name: string;
          organization_id: string;
          permissions: string[];
          system_key: string | null;
        };
        Insert: {
          description?: string | null;
          id?: string;
          is_system?: boolean;
          name: string;
          organization_id: string;
          permissions?: string[];
          system_key?: string | null;
        };
        Update: {
          description?: string | null;
          id?: string;
          is_system?: boolean;
          name?: string;
          organization_id?: string;
          permissions?: string[];
          system_key?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      rooms: {
        Row: {
          branch_id: string;
          capacity: number | null;
          id: string;
          name: string;
          organization_id: string;
        };
        Insert: {
          branch_id: string;
          capacity?: number | null;
          id?: string;
          name: string;
          organization_id: string;
        };
        Update: {
          branch_id?: string;
          capacity?: number | null;
          id?: string;
          name?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rooms_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      salary_entries: {
        Row: {
          amount: number;
          created_at: string;
          created_by: string | null;
          id: string;
          kind: Database["public"]["Enums"]["salary_entry_kind"];
          method_id: string | null;
          note: string | null;
          organization_id: string;
          period: string;
          staff_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["salary_entry_kind"];
          method_id?: string | null;
          note?: string | null;
          organization_id: string;
          period: string;
          staff_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["salary_entry_kind"];
          method_id?: string | null;
          note?: string | null;
          organization_id?: string;
          period?: string;
          staff_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "salary_entries_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "salary_entries_method_id_fkey";
            columns: ["method_id"];
            isOneToOne: false;
            referencedRelation: "payment_methods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "salary_entries_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "salary_entries_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      salary_rules: {
        Row: {
          amount: number | null;
          group_id: string | null;
          id: string;
          organization_id: string;
          percent: number | null;
          staff_id: string;
          type: Database["public"]["Enums"]["salary_type"];
          valid_from: string;
          valid_to: string | null;
        };
        Insert: {
          amount?: number | null;
          group_id?: string | null;
          id?: string;
          organization_id: string;
          percent?: number | null;
          staff_id: string;
          type: Database["public"]["Enums"]["salary_type"];
          valid_from: string;
          valid_to?: string | null;
        };
        Update: {
          amount?: number | null;
          group_id?: string | null;
          id?: string;
          organization_id?: string;
          percent?: number | null;
          staff_id?: string;
          type?: Database["public"]["Enums"]["salary_type"];
          valid_from?: string;
          valid_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "salary_rules_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "salary_rules_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "salary_rules_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      staff: {
        Row: {
          all_branches: boolean;
          created_at: string;
          id: string;
          is_active: boolean;
          is_teacher: boolean;
          organization_id: string;
          role_id: string;
          user_id: string;
        };
        Insert: {
          all_branches?: boolean;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          is_teacher?: boolean;
          organization_id: string;
          role_id: string;
          user_id: string;
        };
        Update: {
          all_branches?: boolean;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          is_teacher?: boolean;
          organization_id?: string;
          role_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_role_same_org";
            columns: ["role_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "staff_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_branches: {
        Row: {
          branch_id: string;
          staff_id: string;
        };
        Insert: {
          branch_id: string;
          staff_id: string;
        };
        Update: {
          branch_id?: string;
          staff_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_branches_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_branches_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      student_notes: {
        Row: {
          body: string;
          created_at: string;
          created_by: string | null;
          id: string;
          organization_id: string;
          student_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          organization_id: string;
          student_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          organization_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_notes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_notes_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_notes_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "student_balances";
            referencedColumns: ["student_id"];
          },
          {
            foreignKeyName: "student_notes_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      student_tags: {
        Row: {
          student_id: string;
          tag_id: string;
        };
        Insert: {
          student_id: string;
          tag_id: string;
        };
        Update: {
          student_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_tags_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "student_balances";
            referencedColumns: ["student_id"];
          },
          {
            foreignKeyName: "student_tags_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      students: {
        Row: {
          address: string | null;
          archived_at: string | null;
          birth_date: string | null;
          branch_id: string;
          created_at: string;
          full_name: string;
          gender: Database["public"]["Enums"]["gender"] | null;
          id: string;
          joined_at: string;
          organization_id: string;
          parent_name: string | null;
          parent_phone: string | null;
          parent_telegram_id: number | null;
          passport_series: string | null;
          phone: string;
          photo_url: string | null;
          school: string | null;
          telegram_username: string | null;
          user_id: string | null;
        };
        Insert: {
          address?: string | null;
          archived_at?: string | null;
          birth_date?: string | null;
          branch_id: string;
          created_at?: string;
          full_name: string;
          gender?: Database["public"]["Enums"]["gender"] | null;
          id?: string;
          joined_at?: string;
          organization_id: string;
          parent_name?: string | null;
          parent_phone?: string | null;
          parent_telegram_id?: number | null;
          passport_series?: string | null;
          phone: string;
          photo_url?: string | null;
          school?: string | null;
          telegram_username?: string | null;
          user_id?: string | null;
        };
        Update: {
          address?: string | null;
          archived_at?: string | null;
          birth_date?: string | null;
          branch_id?: string;
          created_at?: string;
          full_name?: string;
          gender?: Database["public"]["Enums"]["gender"] | null;
          id?: string;
          joined_at?: string;
          organization_id?: string;
          parent_name?: string | null;
          parent_phone?: string | null;
          parent_telegram_id?: number | null;
          passport_series?: string | null;
          phone?: string;
          photo_url?: string | null;
          school?: string | null;
          telegram_username?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "students_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "students_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "students_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: {
          color: string | null;
          id: string;
          name: string;
          organization_id: string;
        };
        Insert: {
          color?: string | null;
          id?: string;
          name: string;
          organization_id: string;
        };
        Update: {
          color?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tags_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      telegram_group_links: {
        Row: {
          chat_id: number;
          connected_at: string;
          group_id: string;
          id: string;
          organization_id: string;
        };
        Insert: {
          chat_id: number;
          connected_at?: string;
          group_id: string;
          id?: string;
          organization_id: string;
        };
        Update: {
          chat_id?: number;
          connected_at?: string;
          group_id?: string;
          id?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "telegram_group_links_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "telegram_group_links_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          amount: number;
          branch_id: string;
          created_at: string;
          created_by: string | null;
          enrollment_id: string | null;
          external_ref: string | null;
          id: string;
          idempotency_key: string | null;
          kind: Database["public"]["Enums"]["tx_kind"];
          lessons_count: number | null;
          method_id: string | null;
          note: string | null;
          organization_id: string;
          period_end: string | null;
          period_start: string | null;
          student_id: string;
          voids_id: string | null;
        };
        Insert: {
          amount: number;
          branch_id: string;
          created_at?: string;
          created_by?: string | null;
          enrollment_id?: string | null;
          external_ref?: string | null;
          id?: string;
          idempotency_key?: string | null;
          kind: Database["public"]["Enums"]["tx_kind"];
          lessons_count?: number | null;
          method_id?: string | null;
          note?: string | null;
          organization_id: string;
          period_end?: string | null;
          period_start?: string | null;
          student_id: string;
          voids_id?: string | null;
        };
        Update: {
          amount?: number;
          branch_id?: string;
          created_at?: string;
          created_by?: string | null;
          enrollment_id?: string | null;
          external_ref?: string | null;
          id?: string;
          idempotency_key?: string | null;
          kind?: Database["public"]["Enums"]["tx_kind"];
          lessons_count?: number | null;
          method_id?: string | null;
          note?: string | null;
          organization_id?: string;
          period_end?: string | null;
          period_start?: string | null;
          student_id?: string;
          voids_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_enrollment_id_fkey";
            columns: ["enrollment_id"];
            isOneToOne: false;
            referencedRelation: "enrollments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_method_id_fkey";
            columns: ["method_id"];
            isOneToOne: false;
            referencedRelation: "payment_methods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "student_balances";
            referencedColumns: ["student_id"];
          },
          {
            foreignKeyName: "transactions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_voids_id_fkey";
            columns: ["voids_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      student_balances: {
        Row: {
          balance: number | null;
          old_debt: number | null;
          organization_id: string | null;
          student_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "students_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      apply_holiday: { Args: { p_holiday: string }; Returns: string[] };
      apply_lesson_plan: {
        Args: { p_group: string; p_insert: Json; p_remove: string[]; p_update: Json };
        Returns: undefined;
      };
      assert_group_editor: { Args: { p_group: string }; Returns: string };
      can_edit_student: { Args: { org: string; p_student: string }; Returns: boolean };
      can_see_branch: { Args: { br: string; org: string }; Returns: boolean };
      can_see_group: { Args: { org: string; p_group: string }; Returns: boolean };
      can_see_lead: { Args: { org: string; p_lead: string }; Returns: boolean };
      can_see_student: { Args: { org: string; p_student: string }; Returns: boolean };
      current_staff: {
        Args: { org: string };
        Returns: {
          all_branches: boolean;
          created_at: string;
          id: string;
          is_active: boolean;
          is_teacher: boolean;
          organization_id: string;
          role_id: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "staff";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      current_staff_id: { Args: { org: string }; Returns: string };
      enrollment_student: { Args: { p_enrollment: string }; Returns: string };
      find_profile_by_phone: {
        Args: { p_org: string; p_phone: string };
        Returns: {
          full_name: string;
          id: string;
        }[];
      };
      has_permission: { Args: { org: string; perm: string }; Returns: boolean };
      is_colleague: { Args: { p_user: string }; Returns: boolean };
      is_member: { Args: { org: string }; Returns: boolean };
      my_permissions: { Args: { org: string }; Returns: string[] };
      register_organization: {
        Args: { p_branch_name: string; p_org_name: string; p_owner_name: string; p_roles: Json };
        Returns: string;
      };
      remove_holiday: { Args: { p_holiday: string }; Returns: string[] };
      save_staff: {
        Args: {
          p_all_branches: boolean;
          p_branch_ids: string[];
          p_is_teacher: boolean;
          p_org: string;
          p_role_id: string;
          p_staff_id?: string;
          p_user_id?: string;
        };
        Returns: string;
      };
      staff_org: { Args: { p_staff: string }; Returns: string };
      try_uuid: { Args: { p: string }; Returns: string };
    };
    Enums: {
      attendance_status: "present" | "late" | "absent" | "excused";
      enrollment_status: "trial" | "active" | "frozen" | "left";
      expense_kind: "operating" | "salary" | "rent" | "marketing" | "tax" | "owner_draw";
      gender: "male" | "female";
      lesson_status: "scheduled" | "held" | "cancelled";
      method_kind: "cash" | "card" | "terminal" | "bank" | "online";
      org_status: "trial" | "active" | "suspended";
      reason_kind: "leave" | "freeze" | "refund" | "void" | "lead_lost";
      salary_entry_kind: "payout" | "bonus" | "penalty" | "override";
      salary_type: "fixed_monthly" | "fixed_per_group" | "percent_of_revenue" | "per_lesson";
      tx_kind: "payment" | "charge" | "refund" | "adjustment" | "void";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      attendance_status: ["present", "late", "absent", "excused"],
      enrollment_status: ["trial", "active", "frozen", "left"],
      expense_kind: ["operating", "salary", "rent", "marketing", "tax", "owner_draw"],
      gender: ["male", "female"],
      lesson_status: ["scheduled", "held", "cancelled"],
      method_kind: ["cash", "card", "terminal", "bank", "online"],
      org_status: ["trial", "active", "suspended"],
      reason_kind: ["leave", "freeze", "refund", "void", "lead_lost"],
      salary_entry_kind: ["payout", "bonus", "penalty", "override"],
      salary_type: ["fixed_monthly", "fixed_per_group", "percent_of_revenue", "per_lesson"],
      tx_kind: ["payment", "charge", "refund", "adjustment", "void"],
    },
  },
} as const;
