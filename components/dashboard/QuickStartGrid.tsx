import Link from "next/link";
import { Card } from "@/components/ui/Card";

const steps = [
  {
    step: 1,
    icon: "👥",
    title: "Add a Client",
    description: "Register your first client with contact details and company info.",
    href: "/clients",
  },
  {
    step: 2,
    icon: "📅",
    title: "Create an Event",
    description: "Set up a wedding, birthday, or corporate event with date and venue.",
    href: "/events",
  },
  {
    step: 3,
    icon: "🎨",
    title: "Upload Card Design",
    description: "Upload your invitation card template in PNG, JPG, or PDF format.",
    href: "/cards",
  },
  {
    step: 4,
    icon: "📋",
    title: "Import Guest List",
    description: "Upload your guest list via Excel with names and phone numbers.",
    href: "/guests",
  },
  {
    step: 5,
    icon: "✨",
    title: "Personalize Cards",
    description: "Generate personalized invitation cards with guest names and QR codes.",
    href: "/cards",
  },
  {
    step: 6,
    icon: "📱",
    title: "Send Invitations",
    description: "Deliver invitations via WhatsApp or SMS and track delivery status.",
    href: "/guests",
  },
];

export function QuickStartGrid() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-h2 text-neutral-text">Quick Start Guide</h2>
        <p className="text-neutral-muted mt-1">Follow these steps to send your first digital invitation</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {steps.map((item, index) => (
          <Link key={item.step} href={item.href} className="block">
            <Card
              hover
              className="h-full animate-slide-up"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                  <span className="text-small font-semibold text-primary">Step {item.step}</span>
                </div>
                <div>
                  <h3 className="text-h3 text-neutral-text">{item.title}</h3>
                  <p className="text-small text-neutral-muted mt-2 leading-relaxed">{item.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
