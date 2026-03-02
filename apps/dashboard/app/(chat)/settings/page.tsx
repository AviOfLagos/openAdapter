import { ServerSettings } from "@/components/server-settings";

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure and manage your OpenAdapter server
            </p>
          </div>
          <ServerSettings />
        </div>
      </div>
    </div>
  );
}
