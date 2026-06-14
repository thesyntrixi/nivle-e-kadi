export const navItems = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/messages", label: "Messages", icon: "messages" },
  { href: "/reports", label: "Reports", icon: "reports" },
  { href: "/clients", label: "Clients", icon: "clients" },
  { href: "/events", label: "Events", icon: "events" },
  { href: "/cards", label: "Cards", icon: "cards" },
  { href: "/guests", label: "Guests", icon: "guests" },
  { href: "/checkin", label: "Check-in", icon: "checkin" },
  { href: "/staff", label: "Staff", icon: "staff" },
] as const;

export const staffNavItems = [
  { href: "/check-in-staff", label: "Check-in", icon: "checkin" },
] as const;

export type NavItem = (typeof navItems)[number] | (typeof staffNavItems)[number];
export type NavIcon = NavItem["icon"];

export const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Overview of your NIVLE E-Kadi activity" },
  "/messages": { title: "Messages", subtitle: "Send and track SMS and WhatsApp invitations" },
  "/reports": { title: "Reports", subtitle: "Analytics and delivery reports" },
  "/clients": { title: "Clients", subtitle: "Manage your client accounts" },
  "/events": { title: "Events", subtitle: "Create and manage events" },
  "/cards": { title: "Cards", subtitle: "Design and upload invitation cards" },
  "/guests": { title: "Guests", subtitle: "Manage guest lists and invitations" },
  "/staff": { title: "Staff", subtitle: "Manage check-in staff and event assignments" },
  "/check-in-staff": { title: "Check-in", subtitle: "Select an event to check in guests" },
};
