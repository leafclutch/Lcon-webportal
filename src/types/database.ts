export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  __InternalSupabase: { PostgrestVersion: '12' }
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          role_id: string | null
          avatar_url: string | null
          is_approved: boolean
          last_active_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          role_id?: string | null
          avatar_url?: string | null
          is_approved?: boolean
          last_active_at?: string | null
        }
        Update: {
          name?: string
          email?: string
          role_id?: string | null
          avatar_url?: string | null
          is_approved?: boolean
          last_active_at?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: { id: string; name: string; description: string | null; created_at: string }
        Insert: { name: string; description?: string | null }
        Update: { name?: string; description?: string | null }
        Relationships: []
      }
      permissions: {
        Row: { id: string; name: string; description: string | null; created_at: string }
        Insert: { name: string; description?: string | null }
        Update: { name?: string; description?: string | null }
        Relationships: []
      }
      role_permissions: {
        Row: { id: string; role_id: string; permission_id: string; created_at: string }
        Insert: { role_id: string; permission_id: string }
        Update: Record<string, never>
        Relationships: []
      }
      attendance_codes: {
        Row: {
          id: string; code: string; type: 'tap_in' | 'tap_out'; created_by: string;
          expires_at: string; date: string; is_active: boolean; created_at: string
        }
        Insert: {
          code: string; type: 'tap_in' | 'tap_out'; created_by: string;
          expires_at: string; date?: string; is_active?: boolean
        }
        Update: { is_active?: boolean }
        Relationships: []
      }
      attendance_logs: {
        Row: {
          id: string; user_id: string; tap_in_time: string | null; tap_out_time: string | null;
          date: string; status: 'present' | 'late' | 'absent' | 'half_day';
          created_at: string; updated_at: string
        }
        Insert: {
          user_id: string; tap_in_time?: string | null; tap_out_time?: string | null;
          date?: string; status?: 'present' | 'late' | 'absent' | 'half_day'
        }
        Update: {
          tap_in_time?: string | null; tap_out_time?: string | null;
          status?: 'present' | 'late' | 'absent' | 'half_day'
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string; title: string; description: string | null; assigned_by: string;
          assigned_to: string; deadline: string | null;
          priority: 'low' | 'medium' | 'high' | 'urgent';
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          created_at: string; updated_at: string
        }
        Insert: {
          title: string; description?: string | null; assigned_by: string;
          assigned_to: string; deadline?: string | null;
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
        }
        Update: {
          title?: string; description?: string | null; deadline?: string | null;
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
        }
        Relationships: []
      }
      todos: {
        Row: {
          id: string; title: string; description: string | null; user_id: string;
          created_by: string; status: 'pending' | 'in_progress' | 'completed';
          attachment_url: string | null; created_at: string; updated_at: string
        }
        Insert: {
          title: string; description?: string | null; user_id: string; created_by: string;
          status?: 'pending' | 'in_progress' | 'completed'; attachment_url?: string | null
        }
        Update: {
          title?: string; description?: string | null;
          status?: 'pending' | 'in_progress' | 'completed'; attachment_url?: string | null
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          id: string; user_id: string; reason: string; start_date: string; end_date: string;
          status: 'pending' | 'approved' | 'rejected'; approved_by: string | null;
          approved_at: string | null; created_at: string; updated_at: string
        }
        Insert: {
          user_id: string; reason: string; start_date: string; end_date: string;
          status?: 'pending' | 'approved' | 'rejected'
        }
        Update: {
          status?: 'pending' | 'approved' | 'rejected';
          approved_by?: string | null; approved_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string; sender_id: string; receiver_id: string; content: string | null;
          voice_url: string | null; is_read: boolean; created_at: string
        }
        Insert: {
          sender_id: string; receiver_id: string; content?: string | null;
          voice_url?: string | null; is_read?: boolean
        }
        Update: { is_read?: boolean }
        Relationships: []
      }
      announcements: {
        Row: {
          id: string; title: string; content: string; created_by: string;
          created_at: string; updated_at: string
        }
        Insert: { title: string; content: string; created_by: string }
        Update: { title?: string; content?: string }
        Relationships: []
      }
      warnings: {
        Row: {
          id: string; user_id: string; issued_by: string; reason: string; created_at: string
        }
        Insert: { user_id: string; issued_by: string; reason: string }
        Update: Record<string, never>
        Relationships: []
      }
      projects: {
        Row: {
          id: string; name: string; description: string | null; created_by: string;
          status: 'active' | 'completed' | 'on_hold' | 'cancelled';
          created_at: string; updated_at: string
        }
        Insert: {
          name: string; description?: string | null; created_by: string;
          status?: 'active' | 'completed' | 'on_hold' | 'cancelled'
        }
        Update: {
          name?: string; description?: string | null;
          status?: 'active' | 'completed' | 'on_hold' | 'cancelled'
        }
        Relationships: []
      }
      project_members: {
        Row: { id: string; project_id: string; user_id: string; created_at: string }
        Insert: { project_id: string; user_id: string }
        Update: Record<string, never>
        Relationships: []
      }
      daily_updates: {
        Row: { id: string; user_id: string; content: string; created_at: string; updated_at: string }
        Insert: { user_id: string; content: string }
        Update: { content?: string }
        Relationships: []
      }
      ideas: {
        Row: {
          id: string; user_id: string; content: string; likes: number;
          created_at: string; updated_at: string
        }
        Insert: { user_id: string; content: string }
        Update: { content?: string; likes?: number }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string; user_id: string; title: string; body: string | null;
          type: 'message' | 'task' | 'warning' | 'leave' | 'announcement' | 'reminder' | 'system';
          entity_type: string | null; entity_id: string | null;
          is_read: boolean; created_at: string
        }
        Insert: {
          user_id: string; title: string; body?: string | null;
          type: 'message' | 'task' | 'warning' | 'leave' | 'announcement' | 'reminder' | 'system';
          entity_type?: string | null; entity_id?: string | null; is_read?: boolean
        }
        Update: { is_read?: boolean }
        Relationships: []
      }
      attachments: {
        Row: {
          id: string; uploaded_by: string;
          entity_type: 'task' | 'todo' | 'message' | 'announcement' | 'daily_update' | 'idea' | 'group_message';
          entity_id: string; type: 'file' | 'voice' | 'link' | 'image';
          name: string | null; url: string; size_bytes: number | null;
          mime_type: string | null; created_at: string
        }
        Insert: {
          uploaded_by: string;
          entity_type: 'task' | 'todo' | 'message' | 'announcement' | 'daily_update' | 'idea' | 'group_message';
          entity_id: string; type: 'file' | 'voice' | 'link' | 'image';
          name?: string | null; url: string; size_bytes?: number | null; mime_type?: string | null
        }
        Update: Record<string, never>
        Relationships: []
      }
      groups: {
        Row: { id: string; name: string; description: string | null; created_by: string; created_at: string; updated_at: string }
        Insert: { name: string; description?: string | null; created_by: string }
        Update: { name?: string; description?: string | null }
        Relationships: []
      }
      group_members: {
        Row: { group_id: string; user_id: string; added_by: string | null; joined_at: string }
        Insert: { group_id: string; user_id: string; added_by?: string | null }
        Update: Record<string, never>
        Relationships: []
      }
      group_messages: {
        Row: { id: string; group_id: string; sender_id: string; content: string | null; voice_url: string | null; created_at: string }
        Insert: { group_id: string; sender_id: string; content?: string | null; voice_url?: string | null }
        Update: Record<string, never>
        Relationships: []
      }
      group_message_reads: {
        Row: { message_id: string; user_id: string; read_at: string }
        Insert: { message_id: string; user_id: string }
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      user_has_permission: {
        Args: { permission_name: string }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience types
export type User = Database['public']['Tables']['users']['Row']
export type Role = Database['public']['Tables']['roles']['Row']
export type Permission = Database['public']['Tables']['permissions']['Row']
export type RolePermission = Database['public']['Tables']['role_permissions']['Row']
export type AttendanceCode = Database['public']['Tables']['attendance_codes']['Row']
export type AttendanceLog = Database['public']['Tables']['attendance_logs']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type Todo = Database['public']['Tables']['todos']['Row']
export type LeaveRequest = Database['public']['Tables']['leave_requests']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Announcement = Database['public']['Tables']['announcements']['Row']
export type Warning = Database['public']['Tables']['warnings']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectMember = Database['public']['Tables']['project_members']['Row']
export type DailyUpdate = Database['public']['Tables']['daily_updates']['Row']
export type Idea = Database['public']['Tables']['ideas']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type Attachment = Database['public']['Tables']['attachments']['Row']
export type Group = Database['public']['Tables']['groups']['Row']
export type GroupMember = Database['public']['Tables']['group_members']['Row']
export type GroupMessage = Database['public']['Tables']['group_messages']['Row']
export type GroupMessageRead = Database['public']['Tables']['group_message_reads']['Row']

// Extended types with joins
export type UserWithRole = User & { roles: Role | null }
export type TaskWithUsers = Task & { assigner: User; assignee: User }
export type LeaveRequestWithUser = LeaveRequest & { user: User; approver: User | null }
export type WarningWithUsers = Warning & { user: User; issuer: User }
export type MessageWithSender = Message & { sender: User }
export type AnnouncementWithAuthor = Announcement & { author: User }
export type DailyUpdateWithUser = DailyUpdate & { user: User }
export type IdeaWithUser = Idea & { user: User }
export type ProjectWithCreator = Project & { creator: User }
