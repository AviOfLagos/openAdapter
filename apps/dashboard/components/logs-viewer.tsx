"use client";

import { useEffect, useState, useRef } from "react";
import { FileText, RefreshCw, Search, Trash2, Download } from "lucide-react";
import { openAdapterClient } from "@/lib/openadapter-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface LogLine {
  line: number;
  content: string;
  timestamp?: string;
  level?: string;
}

export function LogsViewer() {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      const response = await openAdapterClient.getLogs(1000);
      const parsedLogs: LogLine[] = response.logs.map((log, index) => ({
        line: index + 1,
        content: typeof log === "string" ? log : JSON.stringify(log),
        timestamp: typeof log === "object" ? log.timestamp : undefined,
        level: typeof log === "object" ? log.level : undefined,
      }));
      setLogs(parsedLogs);
      setLoading(false);
    } catch (err) {
      toast.error("Failed to fetch logs");
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      await openAdapterClient.clearLogs();
      setLogs([]);
      setFilteredLogs([]);
      toast.success("Logs cleared successfully");
    } catch (err) {
      toast.error("Failed to clear logs");
    }
  };

  const handleDownloadLogs = () => {
    const content = logs.map((log) => log.content).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `openadapter-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Logs downloaded");
  };

  useEffect(() => {
    fetchLogs();
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = logs.filter((log) =>
        log.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLogs(filtered);
    } else {
      setFilteredLogs(logs);
    }
  }, [searchQuery, logs]);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[calc(100vh-240px)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Server Logs
            <span className="text-sm font-normal text-muted-foreground">
              ({filteredLogs.length} {filteredLogs.length === 1 ? "line" : "lines"})
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-green-50 dark:bg-green-950" : ""}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadLogs}>
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearLogs}
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="font-mono text-xs space-y-1">
            {filteredLogs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No logs to display</p>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.line}
                  className="flex gap-2 hover:bg-muted/50 px-2 py-1 rounded"
                >
                  <span className="text-muted-foreground select-none min-w-[3rem] text-right">
                    {log.line}
                  </span>
                  <span className="flex-1 whitespace-pre-wrap break-words">
                    {log.content}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
