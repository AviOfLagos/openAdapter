"use client";

import { useEffect, useState } from "react";
import { Activity, AlertCircle, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { openAdapterClient, type HealthResponse } from "@/lib/openadapter-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export function ServerHealthMonitor() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      const data = await openAdapterClient.getHealth();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch health data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Poll every 5 seconds
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Connection Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="mt-2 text-sm">
            Make sure the OpenAdapter server is running on port 3001.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!health) return null;

  const successRate = health.stats.totalRequests > 0
    ? (health.stats.successfulRequests / health.stats.totalRequests) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Overall Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={health.status === "healthy" ? "default" : "destructive"}
              className="text-lg px-3 py-1"
            >
              {health.status}
            </Badge>
          </CardContent>
        </Card>

        {/* Browser Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Browser</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {health.browser.alive ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-lg font-semibold">Online</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-lg font-semibold">Offline</span>
                </>
              )}
            </div>
            {health.browser.lastUsed && (
              <p className="text-xs text-muted-foreground mt-1">
                Last used: {new Date(health.browser.lastUsed).toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Uptime */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{health.uptime.human}</div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{successRate.toFixed(1)}%</div>
            <Progress value={successRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Request Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Request Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-bold">{health.stats.totalRequests}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Successful</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {health.stats.successfulRequests}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {health.stats.failedRequests}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rate Limited</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {health.stats.rateLimitHits}
              </p>
            </div>
          </div>
          {health.stats.lastRequestTime && (
            <p className="mt-4 text-sm text-muted-foreground">
              Last request: {new Date(health.stats.lastRequestTime).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
