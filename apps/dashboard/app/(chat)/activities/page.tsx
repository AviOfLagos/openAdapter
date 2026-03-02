import { ServerHealthMonitor } from "@/components/server-health-monitor";

export default function ActivitiesPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Server Activities</h1>
            <p className="text-muted-foreground mt-1">
              Real-time monitoring of OpenAdapter server health and performance
            </p>
          </div>
          <ServerHealthMonitor />
        </div>
      </div>
    </div>
  );
}
