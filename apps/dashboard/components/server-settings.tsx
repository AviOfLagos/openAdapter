"use client";

import { useEffect, useState } from "react";
import { Settings, Power, RotateCcw, MessageSquarePlus, Server } from "lucide-react";
import { openAdapterClient, type ConfigResponse } from "@/lib/openadapter-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ServerSettings() {
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      const data = await openAdapterClient.getConfig();
      setConfig(data);
      setLoading(false);
    } catch (err) {
      toast.error("Failed to fetch server configuration");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleRestartSession = async () => {
    setActionLoading("restart");
    try {
      const result = await openAdapterClient.restartSession();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error || "Failed to restart session");
      }
    } catch (err) {
      toast.error("Failed to restart session");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecoverSession = async () => {
    setActionLoading("recover");
    try {
      const result = await openAdapterClient.recoverSession();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error || "Failed to recover session");
      }
    } catch (err) {
      toast.error("Failed to recover session");
    } finally {
      setActionLoading(null);
    }
  };

  const handleNewChat = async () => {
    setActionLoading("newchat");
    try {
      const result = await openAdapterClient.newChat();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error || "Failed to start new chat");
      }
    } catch (err) {
      toast.error("Failed to start new chat");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Server Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Server Configuration
          </CardTitle>
          <CardDescription>Current OpenAdapter server settings</CardDescription>
        </CardHeader>
        <CardContent>
          {config ? (
            <dl className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <dt className="font-medium text-muted-foreground">Port</dt>
                <dd className="font-mono">{config.port}</dd>
              </div>
              <div className="flex justify-between py-2 border-b">
                <dt className="font-medium text-muted-foreground">Environment</dt>
                <dd className="font-mono">{config.environment}</dd>
              </div>
              <div className="flex justify-between py-2 border-b">
                <dt className="font-medium text-muted-foreground">Max Timeout</dt>
                <dd className="font-mono">{config.maxTimeout}ms</dd>
              </div>
              <div className="flex justify-between py-2 border-b">
                <dt className="font-medium text-muted-foreground">Poll Interval</dt>
                <dd className="font-mono">{config.pollInterval}ms</dd>
              </div>
              <div className="flex justify-between py-2 border-b">
                <dt className="font-medium text-muted-foreground">Session Timeout</dt>
                <dd className="font-mono">{config.sessionTimeout}ms</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="font-medium text-muted-foreground">Large Prompt Threshold</dt>
                <dd className="font-mono">{config.largePromptThreshold} chars</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Configuration not available</p>
          )}
        </CardContent>
      </Card>

      {/* Session Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Session Controls
          </CardTitle>
          <CardDescription>
            Manage the browser session and connection to Claude.ai
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={handleNewChat}
              disabled={actionLoading === "newchat"}
            >
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              {actionLoading === "newchat" ? "Starting..." : "New Chat"}
            </Button>

            <Button
              variant="outline"
              className="justify-start"
              onClick={handleRecoverSession}
              disabled={actionLoading === "recover"}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {actionLoading === "recover" ? "Recovering..." : "Recover Session"}
            </Button>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full justify-start"
                disabled={actionLoading === "restart"}
              >
                <Power className="h-4 w-4 mr-2" />
                {actionLoading === "restart" ? "Restarting..." : "Restart Browser Session"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restart Browser Session?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will close and reopen the browser, which may take a few seconds.
                  Active requests will be interrupted. Are you sure you want to continue?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRestartSession}>
                  Restart
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Session Control Information */}
      <Card>
        <CardHeader>
          <CardTitle>About Session Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">New Chat</p>
            <p>Navigate to a new chat conversation in Claude.ai. Use this to start fresh without restarting the browser.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Recover Session</p>
            <p>Attempt to recover the browser session using multi-tier recovery (page reload → new chat → browser restart).</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Restart Browser Session</p>
            <p>Force a complete browser restart. This is the most aggressive option and should only be used when other recovery methods fail.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
