"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Clock,
  CheckSquare,
  ListTodo,
  CalendarOff,
  MessageCircle,
  Megaphone,
  AlertTriangle,
  FolderOpen,
  FileText,
  Lightbulb,
  Users,
  Shield,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { PermissionName } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: PermissionName;
  always?: boolean;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    always: true,
  },
  { label: "Attendance", href: "/attendance", icon: Clock, always: true },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, always: true },
  { label: "My Todos", href: "/todos", icon: ListTodo, always: true },
  { label: "Leave", href: "/leave", icon: CalendarOff, always: true },
  { label: "Messages", href: "/messages", icon: MessageCircle, always: true },
  {
    label: "Announcements",
    href: "/announcements",
    icon: Megaphone,
    always: true,
  },
  { label: "Warnings", href: "/warnings", icon: AlertTriangle, always: true },
  { label: "Projects", href: "/projects", icon: FolderOpen, always: true },
  { label: "Daily Updates", href: "/updates", icon: FileText, always: true },
  { label: "Ideas", href: "/ideas", icon: Lightbulb, always: true },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
    permission: "manage_users",
  },
  {
    label: "Roles",
    href: "/admin/roles",
    icon: Shield,
    permission: "manage_roles",
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted || !hasPermission("approve_users")) return;
    const supabase = createClient();
    let ignore = false;

    const fetch = async () => {
      const { count } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("is_approved", false);
      if (!ignore) setPendingCount(count ?? 0);
    };

    fetch();

    const channel = supabase
      .channel("pending-users")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        fetch,
      )
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, [hasMounted, hasPermission]);

  // Suppress admin items until after client hydration to avoid server/client mismatch
  const adminItems = hasMounted
    ? ADMIN_NAV_ITEMS.filter(
        (item) => !item.permission || hasPermission(item.permission),
      ).map((item) =>
        item.href === "/admin/users" && pendingCount > 0
          ? { ...item, badge: pendingCount }
          : item,
      )
    : [];

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-30 flex h-full w-64 flex-col bg-gray-900 transition-transform duration-300 lg:relative lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            {/* <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white text-sm">
              LC
            </div> */}
            <div className="mx-auto mb-4 flex h-8 w-8 items-center justify-center">
              <img
                src="/favicon.png"
                alt="Leafclutch Logo"
                className="h-8 w-8 object-contain"
              />
            </div>
            <span className="font-semibold text-white">LCON Portal</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* User info */}
        {user && (
          <div className="mx-4 mb-4 rounded-xl bg-gray-800 p-3">
            <div className="flex items-center gap-3">
              <Avatar name={user.name} src={user.avatar_url} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {user.name}
                </p>
                <p className="truncate text-xs text-gray-400">
                  {user.role?.name ?? "No role"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                onClose={onClose}
              />
            ))}

            {adminItems.length > 0 && (
              <>
                <li className="px-3 pt-4 pb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Admin
                  </p>
                </li>
                {adminItems.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onClose={onClose}
                  />
                ))}
              </>
            )}
          </ul>
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-800 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

function NavLink({
  item,
  pathname,
  onClose,
}: {
  item: NavItem;
  pathname: string;
  onClose: () => void;
}) {
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <li>
      <Link
        href={item.href}
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-indigo-600 text-white"
            : "text-gray-400 hover:bg-gray-800 hover:text-white",
        )}
      >
        <item.icon size={16} />
        <span className="flex-1">{item.label}</span>
        {item.badge != null && item.badge > 0 && (
          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white leading-none">
            {item.badge}
          </span>
        )}
      </Link>
    </li>
  );
}
