"use client";

import { Activity, FileText, MessageSquare, Settings } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DashboardTabs() {
  const router = useRouter();
  const pathname = usePathname();

  // Determine active tab from pathname
  const getActiveTab = () => {
    if (pathname.includes("/activities")) return "activities";
    if (pathname.includes("/logs")) return "logs";
    if (pathname.includes("/settings")) return "settings";
    return "chat";
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case "chat":
        router.push("/");
        break;
      case "activities":
        router.push("/activities");
        break;
      case "logs":
        router.push("/logs");
        break;
      case "settings":
        router.push("/settings");
        break;
    }
  };

  return (
    <Tabs
      value={getActiveTab()}
      onValueChange={handleTabChange}
      className="w-full border-b"
    >
      <TabsList className="grid w-full max-w-md grid-cols-4 h-12">
        <TabsTrigger value="chat" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Chat</span>
        </TabsTrigger>
        <TabsTrigger value="activities" className="gap-2">
          <Activity className="h-4 w-4" />
          <span className="hidden sm:inline">Activities</span>
        </TabsTrigger>
        <TabsTrigger value="logs" className="gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Logs</span>
        </TabsTrigger>
        <TabsTrigger value="settings" className="gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
