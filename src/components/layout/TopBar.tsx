import { GlobalSearch } from "./GlobalSearch";
import { QuickAccessMenu } from "./QuickAccessMenu";
import { NotificationsMenu } from "./NotificationsMenu";
import { HelpButton } from "./HelpButton";
import { ProfileMenu } from "./ProfileMenu";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 sm:gap-3 border-b border-line bg-surface/95 backdrop-blur px-3 sm:px-6 py-3">
      <GlobalSearch />
      <div className="flex items-center gap-1 sm:gap-2 ml-auto">
        <QuickAccessMenu />
        <NotificationsMenu />
        <HelpButton />
        <ProfileMenu />
      </div>
    </header>
  );
}
