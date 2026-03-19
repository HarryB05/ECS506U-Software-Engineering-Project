import { DashboardHomeContent } from "@/components/dashboard-home-content";
import { DashboardPageIntro } from "@/components/dashboard-page-intro";

export default function DashboardPage() {
  return (
    <div className="max-w-content mx-auto">
      <DashboardPageIntro />
      <DashboardHomeContent />
    </div>
  );
}
