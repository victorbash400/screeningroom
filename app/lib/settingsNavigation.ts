import { Activity, Bell, FolderClosed, HardDrive, Palette, Plug, CircleUserRound } from "lucide-react";

export const settingsNavigation = [
  { id: "account", label: "Account", icon: CircleUserRound },
  { id: "storage", label: "Storage", icon: HardDrive },
  { id: "connections", label: "Connections", icon: Plug },
  { id: "workspaces", label: "Workspaces", icon: FolderClosed },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "activity", label: "Activity", icon: Activity },
] as const;
