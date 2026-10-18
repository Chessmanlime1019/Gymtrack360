import { GlobalSearch } from "./GlobalSearch";
import { QuickAccessMenu } from "./QuickAccessMenu";
import { NotificationsMenu } from "./NotificationsMenu";
import { HelpButton } from "./HelpButton";
import { ProfileMenu } from "./ProfileMenu";

export function TopBar() {
  return (
    <header
      className="
        sticky
        top-0
        z-30
        flex
        items-center
        gap-2
        sm:gap-3
        min-h-[66px]
        border-b
        border-line
        bg-bar/95
        backdrop-blur-xl
        pl-[max(0.75rem,env(safe-area-inset-left))]
        pr-[max(0.75rem,env(safe-area-inset-right))]
        sm:pl-6
        sm:pr-6
        pt-[calc(0.75rem+env(safe-area-inset-top))]
        pb-3
      "
    >
      <GlobalSearch />

      <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
        <QuickAccessMenu />

        <NotificationsMenu />

        <HelpButton />

        <ProfileMenu />
      </div>
    </header>
  );
}