import { LogsViewer } from "@/components/logs-viewer";

export default function LogsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden p-4 md:p-6">
        <div className="max-w-7xl mx-auto h-full flex flex-col space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Server Logs</h1>
            <p className="text-muted-foreground mt-1">
              Real-time server logs with search and filtering
            </p>
          </div>
          <div className="flex-1 overflow-hidden">
            <LogsViewer />
          </div>
        </div>
      </div>
    </div>
  );
}
