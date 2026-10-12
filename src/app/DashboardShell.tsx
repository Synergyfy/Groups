import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import TopBar from "./TopBar";
import Sidebar, { type NavSection } from "./Sidebar";
import BottomNav, { type BottomNavItem } from "./BottomNav";
import JourneyRail from "../journey/JourneyRail";
import TourOverlay from "../journey/TourOverlay";
import { useJourney } from "../journey/context";
import BottomSheet from "../components/ui/BottomSheet";

function JourneyRecorder({ enabled }: { enabled: boolean }) {
  const location = useLocation();
  const { recordVisit } = useJourney();

  useEffect(() => {
    if (!enabled) return;
    recordVisit(location.pathname);
  }, [location.pathname, recordVisit, enabled]);

  return null;
}

interface DashboardShellProps {
  sectionLabel: string;
  nav: NavSection[];
  bottomNav?: BottomNavItem[];
}

export default function DashboardShell({ sectionLabel, nav, bottomNav }: DashboardShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  // The admin experience deliberately has no guided journey or page tour —
  // guidance there is delivered inline as tooltips and field descriptions.
  const showJourney = !location.pathname.startsWith("/admin");

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <JourneyRecorder enabled={showJourney} />
      <TopBar sectionLabel={sectionLabel} />

      <div className="mx-auto flex w-full max-w-[1440px] flex-1">
        <aside
          data-tour="nav"
          className="hidden w-60 shrink-0 border-r border-white/10 bg-ink-950/60 lg:sticky lg:top-[3.75rem] lg:block lg:h-[calc(100vh-3.75rem)] lg:overflow-y-auto"
        >
          <Sidebar sections={nav} onNavigate={() => setMenuOpen(false)} />
          {showJourney && <JourneyRail />}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 pb-28 lg:p-6 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {bottomNav && (
        <BottomNav
          items={bottomNav}
          onMore={() => setMenuOpen(true)}
        />
      )}

      <BottomSheet
        open={menuOpen}
        title="Menu"
        onClose={() => setMenuOpen(false)}
      >
        <Sidebar sections={nav} onNavigate={() => setMenuOpen(false)} />
        {showJourney && <JourneyRail />}
      </BottomSheet>

      {showJourney && <TourOverlay />}
    </div>
  );
}
