import PropTypes from "prop-types";
import { NavLink } from "react-router-dom";
import {
  DashboardIcon,
  CalendarIcon,
  CardStackIcon,
  PersonIcon,
} from "@radix-ui/react-icons";

const navItems = [
  {
    to: "/user/dashboard",
    key: "dashboard",
    label: "Home",
    labelMm: "ပင်မ",
    icon: DashboardIcon,
  },
  {
    to: "/user/appointments",
    key: "myAppointments",
    label: "Appointments",
    labelMm: "ရက်ချိန်း",
    icon: CalendarIcon,
  },
  {
    to: "/user/billing",
    key: "invoicesAndPayments",
    label: "Payment",
    labelMm: "ငွေပေးချေ",
    icon: CardStackIcon,
  },
  {
    to: "/user/family",
    key: "familyHealthProfiles",
    label: "Family Members",
    labelMm: "မိသားစုဝင်",
    icon: PersonIcon,
  },
];

export default function MobileBottomNav({ language = "en", counts = {} }) {
  return (
    <nav
      aria-label="Patient Navigation"
      className="fixed bottom-3 left-4 right-4 z-40 lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-center justify-around rounded-3xl border border-border/80 bg-card/90 px-3 py-2 shadow-2xl backdrop-blur-2xl transition-colors">
        {navItems.map((item) => {
          const Icon = item.icon;
          const label = language === "mm" ? item.labelMm : item.label;
          const badgeCount =
            item.key === "myAppointments"
              ? counts.appointments
              : item.key === "invoicesAndPayments"
              ? counts.unpaid
              : null;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group relative flex min-h-[44px] min-w-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1 text-[11px] font-bold transition-all ${
                  isActive
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`relative grid h-8 w-12 place-items-center rounded-2xl transition-all ${
                      isActive
                        ? "bg-orange-500/15 text-orange-600 dark:bg-orange-500/25 dark:text-orange-400"
                        : "group-hover:bg-secondary/60"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        isActive ? "scale-110" : ""
                      }`}
                      aria-hidden="true"
                    />

                    {Boolean(badgeCount && badgeCount > 0) && (
                      <span
                        className="absolute -top-1 -right-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-orange-600 px-1 font-mono text-[9px] font-black text-white ring-2 ring-card"
                        aria-label={`${badgeCount} items`}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </div>

                  <span
                    className={`truncate text-[10px] leading-none ${
                      isActive ? "font-black" : "font-semibold"
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

MobileBottomNav.propTypes = {
  language: PropTypes.string,
  counts: PropTypes.shape({
    appointments: PropTypes.number,
    unpaid: PropTypes.number,
  }),
};
