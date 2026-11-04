import { GlobalSearch } from "./GlobalSearch";
import { QuickAccessMenu } from "./QuickAccessMenu";
import { NotificationsMenu } from "./NotificationsMenu";
import { HelpButton } from "./HelpButton";
import { ProfileMenu } from "./ProfileMenu";
import { TemaMenu } from "./TemaMenu";

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

      <div className="flex items-center gap-0.5 sm:gap-1 ml-auto shrink-0">
        <NotificationsMenu />

        <HelpButton />

        <QuickAccessMenu />

        <TemaMenu />

        {/* Línea que separa las herramientas de la cuenta */}
        <span aria-hidden className="hidden sm:block w-px h-8 bg-line-strong mx-2 lg:mx-3" />

        <ProfileMenu />
      </div>
    </header>
  );
}
