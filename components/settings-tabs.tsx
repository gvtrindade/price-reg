"use client";

import { Tabs } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

interface SettingsTabsProps {
  profileLabel: string;
  usersLabel: string;
  isAdmin: boolean;
  profile: React.ReactNode;
  users: React.ReactNode;
}

const tabClass = cn(
  "cursor-pointer rounded-t-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
  "data-[active]:bg-accent data-[active]:text-accent-foreground",
);

export function SettingsTabs({
  profileLabel,
  usersLabel,
  isAdmin,
  profile,
  users,
}: SettingsTabsProps) {
  return (
    <Tabs.Root defaultValue="profile" className="flex flex-col gap-4">
      <Tabs.List className="flex gap-1 border-b">
        <Tabs.Tab value="profile" className={tabClass}>
          {profileLabel}
        </Tabs.Tab>
        {isAdmin && (
          <Tabs.Tab value="users" className={tabClass}>
            {usersLabel}
          </Tabs.Tab>
        )}
      </Tabs.List>
      <Tabs.Panel value="profile">{profile}</Tabs.Panel>
      {isAdmin && <Tabs.Panel value="users">{users}</Tabs.Panel>}
    </Tabs.Root>
  );
}
