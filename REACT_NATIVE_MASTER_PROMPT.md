# LCON Mobile App — Master Prompt for Claude

Use this prompt at the start of a fresh Claude Code session to build the LCON React Native app from scratch, without any help from the user.

---

## SYSTEM CONTEXT

You are building **LCON Mobile** — the official React Native mobile app for **Leafclutch**, a company's internal team management platform. This app connects to the **same Supabase backend** as the existing web portal (LCON Web Portal). Your job is to build a complete, industry-grade SaaS mobile app from scratch with zero shortcuts.

**Do not ask the user for clarification unless you are completely blocked.** Use the full specification below to build the app autonomously. Make all technical decisions yourself.

---

## TECH STACK

- **Framework:** React Native with **Expo** (SDK 51+, managed workflow)
- **Language:** TypeScript (strict mode)
- **Navigation:** Expo Router (file-based routing — same concept as Next.js App Router)
- **Backend:** Supabase (existing database — do NOT run migrations, only read/write)
- **State management:** Zustand
- **Supabase client:** `@supabase/supabase-js` with AsyncStorage for session persistence
- **UI:** React Native Paper OR NativeWind (Tailwind for RN) — choose one and stay consistent
- **Icons:** `@expo/vector-icons` (Ionicons or MaterialCommunityIcons)
- **Forms:** React Hook Form + Zod validation
- **Date handling:** `date-fns`
- **Push notifications:** Expo Notifications + Supabase Edge Functions (for FCM/APNs)
- **File/image upload:** Expo Image Picker + Expo Document Picker → Supabase Storage
- **Audio recording:** Expo AV (for voice messages)
- **Real-time:** Supabase Realtime channels (same as web)

---

## SUPABASE CONNECTION

```
URL:      https://pzbdfayafbjkppbmllov.supabase.co
ANON KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YmRmYXlhZmJqa3BwYm1sbG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMjU1NzcsImV4cCI6MjA5MjgwMTU3N30.ZeDhMbn3G3cJyGWZjFOw4wThO4v0UP7euoIRj3g4NBs
```

Store these in `.env` and access via `expo-constants` or `react-native-dotenv`. Never hardcode them inline.

The service role key is only needed for admin-level auth operations (deleting users, resetting passwords). Store it as a server-side secret in Supabase Edge Functions — never ship it in the mobile app bundle.

---

## DATABASE SCHEMA (Full — Do Not Modify)

All tables are in the `public` schema.

### users
```
id uuid PK, name text, email text, role_id uuid FK→roles,
avatar_url text, is_approved boolean, last_active_at timestamptz,
created_at timestamptz, updated_at timestamptz
```

### roles
```
id uuid PK, name text, description text, created_at timestamptz
```

### permissions
```
id uuid PK, name text, description text, created_at timestamptz
```

### role_permissions
```
id uuid PK, role_id uuid FK→roles, permission_id uuid FK→permissions,
created_at timestamptz
```

### attendance_codes
```
id uuid PK, code text, type 'tap_in'|'tap_out', created_by uuid FK→users,
expires_at timestamptz, date date, is_active boolean, created_at timestamptz
```

### attendance_logs
```
id uuid PK, user_id uuid FK→users, tap_in_time timestamptz,
tap_out_time timestamptz, date date,
status 'present'|'late'|'absent'|'half_day',
type 'onsite'|'remote', created_at timestamptz, updated_at timestamptz
```

### attendance_breaks
```
id uuid PK, log_id uuid FK→attendance_logs, user_id uuid FK→users,
start_time timestamptz, end_time timestamptz, created_at timestamptz
```

### tasks
```
id uuid PK, title text, description text, assigned_by uuid FK→users,
assigned_to uuid FK→users, deadline timestamptz,
priority 'low'|'medium'|'high'|'urgent',
status 'pending'|'in_progress'|'completed'|'cancelled',
created_at timestamptz, updated_at timestamptz
```

### task_comments
```
id uuid PK, task_id uuid FK→tasks, user_id uuid FK→users,
content text, created_at timestamptz
```

### todos
```
id uuid PK, title text, description text, user_id uuid FK→users,
created_by uuid FK→users, status 'pending'|'in_progress'|'completed',
attachment_url text, created_at timestamptz, updated_at timestamptz
```

### leave_requests
```
id uuid PK, user_id uuid FK→users, reason text, start_date date,
end_date date, status 'pending'|'approved'|'rejected',
approved_by uuid FK→users, approved_at timestamptz,
created_at timestamptz, updated_at timestamptz
```

### messages
```
id uuid PK, sender_id uuid FK→users, receiver_id uuid FK→users,
content text, voice_url text, is_read boolean, is_seen boolean,
is_delivered boolean, is_edited boolean, deleted_at timestamptz,
created_at timestamptz
```

### groups
```
id uuid PK, name text, description text, created_by uuid FK→users,
created_at timestamptz, updated_at timestamptz
```

### group_members
```
group_id uuid FK→groups, user_id uuid FK→users,
added_by uuid FK→users, joined_at timestamptz
```

### group_messages
```
id uuid PK, group_id uuid FK→groups, sender_id uuid FK→users,
content text, voice_url text, created_at timestamptz
```

### group_message_reads
```
message_id uuid FK→group_messages, user_id uuid FK→users, read_at timestamptz
```

### announcements
```
id uuid PK, title text, content text, created_by uuid FK→users,
created_at timestamptz, updated_at timestamptz
```

### warnings
```
id uuid PK, user_id uuid FK→users, issued_by uuid FK→users,
reason text, created_at timestamptz
```

### projects
```
id uuid PK, name text, description text, created_by uuid FK→users,
status 'active'|'completed'|'on_hold'|'cancelled',
created_at timestamptz, updated_at timestamptz
```

### project_members
```
id uuid PK, project_id uuid FK→projects, user_id uuid FK→users,
created_at timestamptz
```

### daily_updates
```
id uuid PK, user_id uuid FK→users, content text,
created_at timestamptz, updated_at timestamptz
```

### ideas
```
id uuid PK, user_id uuid FK→users, content text, likes integer,
created_at timestamptz, updated_at timestamptz
```

### notifications
```
id uuid PK, user_id uuid FK→users, title text, body text,
type 'message'|'task'|'comment'|'warning'|'leave'|'announcement'|'reminder'|'system',
entity_type text, entity_id uuid, is_read boolean, created_at timestamptz
```

### attachments
```
id uuid PK, uploaded_by uuid FK→users,
entity_type 'task'|'todo'|'message'|'announcement'|'daily_update'|'idea'|'group_message',
entity_id uuid, type 'file'|'voice'|'link'|'image',
name text, url text, size_bytes bigint, mime_type text, created_at timestamptz
```

### Supabase RPC
- `user_has_permission(permission_name text) → boolean` — checks if the calling user has a named permission

---

## PERMISSION SYSTEM (RBAC)

Every user has a `role_id`. Each role has many permissions via `role_permissions`. The full list of permission names:

```
create_user, manage_users, manage_roles,
generate_attendance_code, view_all_attendance, export_attendance,
assign_task, view_all_tasks, view_all_todos,
approve_leave,
send_announcement,
issue_warning, issue_auto_warning,
manage_projects, view_reports,
delete_user, approve_users,
upload_attachments, send_message,
view_activity_status,
verify_attendance_external,
view_daily_updates,
create_group, manage_messages, delete_message,
use_remote_attendance, comment_on_tasks,
view_notifications
```

**How to check permissions on mobile:**
After login, fetch the user's `role_id`, then query `role_permissions` joined with `permissions` to get their permission list. Store this in Zustand. Use a `usePermission(name)` hook throughout the app.

**Unapproved users** (`is_approved = false`) must be redirected to a "Pending Approval" screen after login. They cannot access any feature.

---

## AUTH FLOW

1. **Sign Up** — user registers with name, email, password → creates Supabase auth user → triggers DB insert into `users` table (via trigger or manual insert) with `is_approved = false`
2. **Login** — Supabase email/password auth → on success, fetch profile + permissions → if `is_approved = false`, go to Pending Approval screen → else go to Dashboard
3. **Forgot Password** — Supabase `resetPasswordForEmail`
4. **Session persistence** — use AsyncStorage adapter for Supabase client so session survives app restarts
5. **Auto sign-out** — on session expiry or 401 errors

---

## APP STRUCTURE (Expo Router)

```
app/
  (auth)/
    login.tsx
    signup.tsx
    forgot-password.tsx
    pending-approval.tsx
  (app)/
    _layout.tsx          ← tab navigator or drawer
    index.tsx            ← Dashboard (home tab)
    attendance/
      index.tsx
    tasks/
      index.tsx
      [id].tsx           ← Task detail + comments
    todos/
      index.tsx
    leave/
      index.tsx
    messages/
      index.tsx
      [userId].tsx       ← 1-on-1 chat
      group/
        [groupId].tsx    ← group chat
    announcements/
      index.tsx
    warnings/
      index.tsx
    projects/
      index.tsx
      [id].tsx
    updates/
      index.tsx
    ideas/
      index.tsx
    notifications/
      index.tsx
    admin/
      users.tsx          ← manage_users permission required
      roles.tsx          ← manage_roles permission required
    profile.tsx
```

---

## SCREEN-BY-SCREEN SPECIFICATION

### Dashboard (Home)
- Welcome greeting with user's first name
- 4 stat cards: Team Members, Pending Tasks, Leave Requests, Warnings Issued
- Today's attendance status widget (clock in time, status badge)
- My Tasks list (last 5, showing priority badge + deadline)
- Recent Announcements (last 3)
- Recent Daily Updates (last 4, with avatars)
- Admin-only banner: pending approvals count → taps to Admin Users screen

### Attendance
**My tab (all users):**
- Today's Status card: work state indicator (not started / working / on break / done)
  - Shows clock-in time, clock-out time, break total
  - Start Break / End Break buttons (only when clocked in and not out)
- Mark Attendance card: text input for 6-char code → submit
- Remote Attendance card (only if `use_remote_attendance` permission):
  - Clock In / Clock Out buttons
- My Attendance History: list of last 60 days

**All Users tab (only if `view_all_attendance` permission):**
- Filter bar: user dropdown, date range, status filter
- Table/list of all attendance records with user avatar, name, date, clock in/out, type (onsite/remote), status
- Export CSV button (only if `export_attendance` permission) — use Expo FileSystem + Sharing

**Generate Code card (only if `generate_attendance_code` permission):**
- Generate Tap In / Tap Out buttons
- Displays large mono code with expiry countdown (15 min)
- Copy button

**Business logic:**
- Tap in before 9am = `present`, at/after 9am = `late`
- Must tap in before tap out
- One tap in and one tap out per day
- Before starting break: must be clocked in and not clocked out

### Tasks
**My Tasks tab:**
- Filter by status, priority
- Task cards showing: title, priority badge (colored), status badge, deadline, assigned by
- Tap task → Task Detail screen

**All Tasks tab (only if `view_all_tasks` permission):**
- Filter by status, priority, assigned user
- Same task cards

**Create Task button (only if `assign_task` permission):**
- Bottom sheet / modal form: title, description, assign to (user picker — can select multiple), priority, deadline
- Sends notification to all assignees

**Task Detail screen:**
- Full task info
- Status change (assigned-to user or assigner can change status)
- Comments section — real-time via Supabase channel
- Add comment (if `comment_on_tasks` permission)
- Delete task (if `assign_task` permission)

### My Todos
- List of todos for current user
- Status filter
- Create todo: title, description, status
- Tap to edit / change status
- Delete (own todos only)
- Admin can see all todos (if `view_all_todos` permission)

### Leave
**My Requests tab:**
- List of own leave requests with status badge (pending/approved/rejected)
- Apply for Leave button: reason, start date, end date pickers

**All Requests tab (only if `approve_leave` permission):**
- Pending leave requests list
- Approve / Reject buttons → notifies the requester

### Messages
- Conversation list: shows all users you have exchanged messages with + all groups you're a member of
- Unread count badges on each conversation
- 1-on-1 Chat screen:
  - Real-time messages via Supabase channel
  - Text input + send button
  - Long-press message to: edit (own), delete (own or if `delete_message`)
  - Voice messages: record with Expo AV → upload to `voices` bucket → send with `voice_url`
  - File/image attachments (if `upload_attachments` permission)
  - Message ticks: sent (✓), delivered (✓✓ grey), seen (✓✓ blue)
  - Mark messages as read when conversation is opened
- Group Chat screen:
  - Same as 1-on-1 but for group_messages
  - Group members list accessible via header
  - Group creator can delete group
- Create Group button (only if `create_group` permission): name + member picker

### Announcements
- List of announcements sorted newest first
- Each card: title, author avatar + name, content, relative time
- Create Announcement (only if `send_announcement` permission): title + content → notifies all users
- Delete Announcement (only if `send_announcement` permission)

### Warnings
**My Warnings tab:**
- List of warnings issued to the current user (reason, issued by, date)

**All Warnings tab (only if `issue_warning` permission):**
- All warnings in the system
- Issue Warning button: pick user + write reason → notifies the user

### Projects
- List of all projects with status badge and creator name
- Tap project → Project Detail: description, status, members list
- Create Project (only if `manage_projects` permission): name, description
- Add Member to project (only if `manage_projects` permission)
- Update project status (only if `manage_projects` permission)

### Daily Updates
- Feed of all team daily updates, newest first
- Each item: avatar, name, content, relative time
- Post Update button: text input → submits
- Delete own update (or admin with `manage_users`)

### Ideas
- Feed of ideas with like count
- Post Idea button
- Like idea (increment `likes` count)
- Delete own idea (or admin with `manage_users`)

### Notifications
- List of all notifications for current user
- Type icons: message, task, warning, leave, announcement, system
- Mark as read on tap
- Unread count badge on tab/nav item
- Real-time via Supabase channel on `notifications` table filtered by `user_id`

### Admin: Users (requires `manage_users` permission)
- List of all users with avatar, name, email, role, approval status
- Pending Approvals section at top with count badge
- Approve / Reject unapproved users
- Assign role to user (role picker)
- Delete user (if `delete_user` permission)
- Reset user password (requires service role — implement via Supabase Edge Function)

### Admin: Roles (requires `manage_roles` permission)
- List of all roles
- Create Role: name + description
- Edit role → toggle permissions checkboxes
- Delete role

### Profile
- Edit own name and avatar (image picker → upload to Supabase Storage `avatars` bucket)
- Show role and permissions list
- Sign out button

---

## REAL-TIME REQUIREMENTS

Use Supabase Realtime channels for the following:
- **Messages** (`messages` table, filter by `receiver_id = current_user_id`)
- **Group messages** (`group_messages` table, filter by group IDs the user belongs to)
- **Notifications** (`notifications` table, filter by `user_id = current_user_id`)
- **Task comments** (`task_comments` table, filter by `task_id` when on Task Detail screen)
- **Pending users count** in sidebar/admin (for admin users — `users` table)

Subscribe when component mounts, unsubscribe on unmount. Update local state on INSERT events.

---

## NOTIFICATION SYSTEM

**In-app notifications:** pulled from the `notifications` table + real-time channel.

**Push notifications (Expo):**
1. Register device on app start: `Notifications.getExpoPushTokenAsync()`
2. Store push token in a `push_tokens` table (create this table in Supabase if not exists): `{ id, user_id, token, platform, created_at }`
3. Trigger push via Supabase Edge Function when:
   - New message received
   - New task assigned
   - Leave request approved/rejected
   - Warning issued
   - Announcement created
4. Use `expo-notifications` to handle foreground/background notification display
5. Tapping a push notification navigates to the relevant screen (deep linking)

---

## BUSINESS LOGIC RULES

### Attendance
- Code is 6 alphanumeric uppercase characters
- Codes expire after 15 minutes
- Only one active tap_in code and one active tap_out code per day
- Tap in before 9:00 AM local time = `present`; at or after 9:00 AM = `late`
- Must tap in before tap out
- Cannot tap in twice in one day
- Cannot tap out twice in one day
- Remote attendance uses the same logic but `type = 'remote'`
- Breaks: can only start when clocked in and not out; only one open break at a time

### Tasks
- Only users with `assign_task` can create/delete tasks
- Status can be updated by: the assignee, the assigner, or anyone with `assign_task`
- Comments require `comment_on_tasks` permission
- Bulk assign: one task can be assigned to multiple users at once (creates separate rows per user)

### Messages
- Soft delete: set `deleted_at` and null out `content` — show "This message was deleted"
- Edit: set `is_edited = true` — show "(edited)" label
- `is_delivered` = true when receiver's app connects and fetches messages
- `is_seen` = true when receiver opens the conversation
- Group messages are not editable or deletable (matches web behavior)

### Leave
- Start date must be before or equal to end date
- Only `approve_leave` can approve/reject

### Warnings
- Cannot be edited or deleted once issued (immutable)

### Permissions
- Always check permissions before showing action buttons
- If a user has no role, they have zero permissions
- Unapproved users are blocked at the navigation level

---

## UI / UX REQUIREMENTS

- **Color scheme:** Dark sidebar (`#111827` gray-900), accent `#4F46E5` indigo-600 — match the web portal aesthetic
- **Status badge colors:**
  - present → green
  - late → yellow/amber
  - absent → red
  - half_day → orange
  - pending → yellow
  - approved → green
  - rejected → red
  - completed → green
  - in_progress → blue
  - cancelled → gray
- **Priority badge colors:**
  - urgent → red
  - high → orange
  - medium → yellow
  - low → gray
- **Avatar component:** Shows initials fallback if no avatar_url
- **Loading states:** Skeleton loaders on list screens, activity indicators on buttons
- **Error states:** Toast/snackbar for errors, retry button on empty/error screens
- **Pull-to-refresh** on all list screens
- **Empty states:** Friendly empty state illustrations/text
- **Keyboard avoiding:** All forms must handle keyboard properly on both iOS and Android

---

## FOLDER STRUCTURE

```
/
├── app/                  (Expo Router screens)
├── src/
│   ├── components/
│   │   ├── ui/           (Button, Card, Badge, Avatar, Input, Modal, etc.)
│   │   ├── layout/       (TabBar, Header, etc.)
│   │   └── [feature]/    (feature-specific components)
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePermission.ts
│   │   └── useRealtime.ts
│   ├── lib/
│   │   ├── supabase.ts   (Supabase client with AsyncStorage)
│   │   └── utils.ts
│   ├── store/
│   │   └── authStore.ts  (Zustand)
│   ├── services/         (one file per domain: attendance, tasks, messages, etc.)
│   └── types/
│       └── database.ts   (copy from web portal)
├── assets/
├── .env
└── app.json
```

---

## SERVICE LAYER (No Server Actions in RN)

Unlike the web portal (which uses Next.js Server Actions), the mobile app talks to Supabase directly from the client. Create a `/src/services/` folder with one file per domain. Each service function:
1. Gets the current session from Supabase
2. Calls the appropriate Supabase query
3. Checks permissions from authStore before mutating
4. Returns `{ data, error }` — never throws

Example: `src/services/attendance.ts` exports `markAttendance(code)`, `clockIn()`, `clockOut()`, `startBreak()`, `endBreak()`, `getMyLogs()`, `getAllLogs(filters)`.

---

## IMPLEMENTATION ORDER

Build in this exact order so you always have a working app at each step:

1. **Project setup** — `npx create-expo-app lcon-mobile --template blank-typescript`, install all dependencies, configure Expo Router, set up `.env`
2. **Supabase client** — `src/lib/supabase.ts` with AsyncStorage persistence
3. **Types** — copy `database.ts` and `index.ts` from web portal into `src/types/`
4. **Auth store** — Zustand store for user + permissions
5. **Auth screens** — Login, Signup, Forgot Password, Pending Approval
6. **Auth guard** — middleware in Expo Router `_layout.tsx` to redirect unauthenticated users
7. **Navigation shell** — Tab navigator with all main routes, icons, notification badge
8. **Dashboard** — stat cards, attendance widget, tasks/announcements/updates feed
9. **Attendance** — full feature including code entry, remote clock-in, break management, admin view
10. **Tasks** — list, detail, create, status updates, comments
11. **Messages** — conversation list, 1-on-1 chat, group chat, voice messages — all real-time
12. **Leave** — request form, list, admin approve/reject
13. **Announcements** — list, create, delete
14. **Warnings** — list, issue warning
15. **Projects** — list, detail, create, member management
16. **Daily Updates + Ideas** — feed, post, delete, likes
17. **Todos** — personal + admin view
18. **Notifications** — in-app list + real-time badge + push notification setup
19. **Admin screens** — Users management, Roles & Permissions
20. **Profile screen** — edit name, avatar upload
21. **Push notifications** — Expo push token registration + deep link handling
22. **Polish** — loading states, error states, pull-to-refresh, empty states, keyboard handling

---

## QUALITY STANDARDS

- TypeScript strict mode — no `any` types
- All Supabase queries typed against `Database` types
- Permission checks before every mutating action
- Real-time subscriptions cleaned up on unmount
- No secrets in the app bundle (service role key goes in Edge Functions only)
- Handles offline gracefully (show stale data, disable mutations)
- Works on both iOS and Android
- All date/time displayed in user's local timezone

---

## WHAT NOT TO DO

- Do NOT run any Supabase migrations — the database schema is fixed
- Do NOT use Next.js, Server Actions, or any web-only APIs
- Do NOT use `react-dom` or any browser DOM APIs
- Do NOT use `localStorage` — use `AsyncStorage` instead
- Do NOT skip permission checks
- Do NOT hardcode user IDs, role names, or permission names as magic strings beyond what's in the spec
- Do NOT use the service role key in the mobile app

---

Start with step 1 of the implementation order. Build each step fully and completely before moving to the next. When you finish all 22 steps, the app should be fully functional and ready for production deployment on both iOS and Android.
