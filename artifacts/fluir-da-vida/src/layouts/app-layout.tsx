/**
 * AppLayout — layout autenticado com sidebar e header.
 *
 * Doc 15 §8 (menu Admin), §26 (menu Profissional), §35 (menu Cliente).
 * Fase 13: ADMIN_NAV atualizado com Agenda e Notificações.
 */
import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { ROLES } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Wrench,
  BedDouble,
  FileBarChart,
  ShieldCheck,
  LogOut,
  Calendar,
  ClipboardList,
  History,
  MapPin,
  User,
  Bell,
  Settings,
  Clock,
  Ban,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard",      href: "/admin",                icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Agenda",         href: "/admin/schedule",       icon: <Calendar className="h-4 w-4" /> },
  { label: "Clientes",       href: "/admin/clients",        icon: <Users className="h-4 w-4" /> },
  { label: "Profissionais",  href: "/admin/professionals",  icon: <Briefcase className="h-4 w-4" /> },
  { label: "Serviços",       href: "/admin/services",       icon: <Wrench className="h-4 w-4" /> },
  { label: "Recursos",       href: "/admin/resources",      icon: <BedDouble className="h-4 w-4" /> },
  { label: "Relatórios",     href: "/admin/reports",        icon: <FileBarChart className="h-4 w-4" /> },
  { label: "Auditoria",      href: "/admin/audit",          icon: <ShieldCheck className="h-4 w-4" /> },
  { label: "Notificações",   href: "/admin/notifications",  icon: <Bell className="h-4 w-4" /> },
  { label: "Configurações",  href: "/admin/settings",       icon: <Settings className="h-4 w-4" /> },
];

const PROFESSIONAL_NAV: NavItem[] = [
  { label: "Dashboard",       href: "/professional",                    icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Novo Agendamento", href: "/professional/book",              icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Minha Agenda",    href: "/professional/schedule",           icon: <Calendar className="h-4 w-4" /> },
  { label: "Meus Clientes",   href: "/professional/clients",            icon: <Users className="h-4 w-4" /> },
  { label: "Disponibilidade", href: "/professional/availability",       icon: <Clock className="h-4 w-4" /> },
  { label: "Bloqueios",       href: "/professional/blocked-periods",    icon: <Ban className="h-4 w-4" /> },
  { label: "Notificações",    href: "/professional/notifications",      icon: <Bell className="h-4 w-4" /> },
  { label: "Meu Perfil",      href: "/professional/profile",            icon: <User className="h-4 w-4" /> },
];

const CLIENT_NAV: NavItem[] = [
  { label: "Início",              href: "/client",                icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Novo Agendamento",    href: "/client/book",           icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Meus Agendamentos",   href: "/client/appointments",   icon: <Calendar className="h-4 w-4" /> },
  { label: "Histórico",           href: "/client/appointments",   icon: <History className="h-4 w-4" /> },
  { label: "Meus Endereços",      href: "/client/addresses",      icon: <MapPin className="h-4 w-4" /> },
  { label: "Meu Perfil",          href: "/client/profile",        icon: <User className="h-4 w-4" /> },
  { label: "Notificações",        href: "/client/notifications",  icon: <Bell className="h-4 w-4" /> },
];

function getNav(roleId: number): NavItem[] {
  if (roleId === ROLES.ADMIN) return ADMIN_NAV;
  if (roleId === ROLES.PROFESSIONAL) return PROFESSIONAL_NAV;
  return CLIENT_NAV;
}

function getRoleLabel(roleId: number): string {
  if (roleId === ROLES.ADMIN) return "Administrador";
  if (roleId === ROLES.PROFESSIONAL) return "Profissional";
  return "Cliente";
}

interface NavLinkProps {
  item: NavItem;
}

function NavLink({ item }: NavLinkProps) {
  const [location] = useLocation();
  const isActive =
    location === item.href ||
    (item.href !== "/" &&
      item.href !== "/admin" &&
      item.href !== "/professional" &&
      item.href !== "/client" &&
      location.startsWith(item.href + "/")) ||
    (item.href === "/admin" && location === "/admin") ||
    (item.href === "/professional" && location === "/professional") ||
    (item.href === "/client" && location === "/client");

  return (
    <Link href={item.href}>
      <span
        className={[
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer",
          isActive
            ? "bg-primary text-primary-foreground font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        ].join(" ")}
      >
        {item.icon}
        {item.label}
      </span>
    </Link>
  );
}

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  if (!user) return null;

  const navItems = getNav(user.roleId);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate("/login");
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r bg-card">
        <div className="flex h-14 items-center px-4">
          <span className="font-semibold tracking-tight">Fluir da Vida</span>
        </div>
        <Separator />

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        <Separator />

        <div className="p-3 space-y-2">
          <div className="px-2 py-1">
            <p className="text-xs font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{getRoleLabel(user.roleId)}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-y-auto">
        <div className="h-full p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
