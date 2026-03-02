# OpenAdapter Dashboard UI/UX Design

**Version:** 1.0
**Date:** 2026-03-02
**Status:** Design Phase

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Overall Layout](#overall-layout)
3. [Tab 1: Chat Interface](#tab-1-chat-interface)
4. [Tab 2: Server Activities](#tab-2-server-activities)
5. [Tab 3: Logs](#tab-3-logs)
6. [Tab 4: Settings](#tab-4-settings)
7. [Component Hierarchy](#component-hierarchy)
8. [shadcn/ui Components Needed](#shadcnui-components-needed)
9. [Tailwind CSS Patterns](#tailwind-css-patterns)
10. [State Management Architecture](#state-management-architecture)
11. [Real-Time Updates Strategy](#real-time-updates-strategy)
12. [Mobile Responsiveness](#mobile-responsiveness)
13. [Accessibility Considerations](#accessibility-considerations)

---

## Design Philosophy

**Core Principles:**
- **Clarity First**: Information should be immediately understandable
- **Action-Oriented**: Quick access to common operations
- **Real-Time Awareness**: Live updates without overwhelming the user
- **Progressive Disclosure**: Advanced features available but not in the way
- **Developer-Friendly**: Clean, minimal, and functional (not overly polished)

**Visual Direction:**
- Modern, clean interface with good contrast
- Monospace fonts for technical data (logs, JSON, IDs)
- Color-coded status indicators (green=healthy, yellow=warning, red=error)
- Subtle animations for state changes
- Dark mode by default (with light mode option)

---

## Overall Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  OpenAdapter Dashboard          [Server: Online ●]    [Theme] 👤│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Chat] [Server Activities] [Logs] [Settings]                   │
│  ─────                                                           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │                                                             │ │
│  │                  Tab Content Area                           │ │
│  │                  (varies by tab)                            │ │
│  │                                                             │ │
│  │                                                             │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [Footer: Version 1.0.0 | Last Updated: 2s ago]                 │
└─────────────────────────────────────────────────────────────────┘
```

**Header Components:**
- Logo/Title (left)
- Global server status indicator (center-right)
- Theme toggle (dark/light)
- User/settings icon (right)

**Tab Navigation:**
- Horizontal tabs below header
- Active tab underlined with accent color
- Badge indicators for notifications (e.g., new errors in Logs tab)

**Footer:**
- Version info
- Last data refresh timestamp
- Connection status

---

## Tab 1: Chat Interface

### Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│  Chat with OpenAdapter AI                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  💬 AI Assistant                                            │ │
│  │  ─────────────                                              │ │
│  │  Hi! I can help you manage your OpenAdapter server.        │ │
│  │  Try asking me to check server health or restart sessions. │ │
│  │                                                             │ │
│  │  👤 You                                                     │ │
│  │  ─────                                                      │ │
│  │  Check the server health                                   │ │
│  │                                                             │ │
│  │  💬 AI Assistant                                            │ │
│  │  ─────────────                                              │ │
│  │  [Calling tool: getServerHealth]                           │ │
│  │                                                             │ │
│  │  Server Status: ✅ Healthy                                  │ │
│  │  • Uptime: 2h 34m                                           │ │
│  │  • Total Requests: 156                                      │ │
│  │  • Success Rate: 94.2%                                      │ │
│  │  • Browser: Online                                          │ │
│  │                                                             │ │
│  │  Everything looks good! No action needed.                  │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Type your message...                          [📎] [Send] │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Suggested Actions:                                              │
│  [Check Health] [Restart Browser] [View Recent Logs] [New Chat] │
└─────────────────────────────────────────────────────────────────┘
```

### Features

**Message Display:**
- Alternating user/assistant messages with clear visual distinction
- Tool calls shown inline with loading states
- Code blocks with syntax highlighting for JSON responses
- Copy button on code blocks
- Timestamp on hover

**Input Area:**
- Textarea with auto-expand (up to 5 lines)
- File attachment button (for sending prompts with files)
- Send button (disabled while generating)
- Character count for large prompts

**Quick Actions:**
- Pre-defined prompts as buttons
- "Check Health", "Restart Browser", "View Logs", etc.
- Clicking a button sends that prompt

**Tool Execution Feedback:**
- Show tool name being called
- Loading spinner during execution
- Success/error indicator
- Expandable JSON response view

### Component Breakdown

```tsx
<ChatTab>
  <ChatHeader />
  <ChatMessageList>
    <ChatMessage role="assistant" />
    <ChatMessage role="user" />
    <ChatMessage role="assistant">
      <ToolCall name="getServerHealth" status="complete" />
      <ToolResult data={...} />
    </ChatMessage>
  </ChatMessageList>
  <ChatInput>
    <FileAttachmentButton />
    <TextArea />
    <SendButton />
  </ChatInput>
  <QuickActions>
    <ActionButton />
  </QuickActions>
</ChatTab>
```

### shadcn/ui Components

- `Card` - Message containers
- `Avatar` - User/AI icons
- `Textarea` - Message input
- `Button` - Send, quick actions
- `Badge` - Tool status indicators
- `ScrollArea` - Chat message list
- `Skeleton` - Loading states
- `Tooltip` - Hover info

### Tailwind Patterns

```css
/* Message containers */
.message-user: bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500
.message-assistant: bg-gray-50 dark:bg-gray-900 border-l-4 border-green-500

/* Tool execution */
.tool-executing: animate-pulse bg-yellow-50 dark:bg-yellow-950
.tool-success: bg-green-50 dark:bg-green-950
.tool-error: bg-red-50 dark:bg-red-950

/* Input area */
.chat-input: border-2 focus-within:border-blue-500 transition-colors

/* Quick actions */
.quick-action: text-sm px-3 py-1 rounded-full border hover:bg-gray-100 dark:hover:bg-gray-800
```

---

## Tab 2: Server Activities

### Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│  Server Activities                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────┐  ┌──────────────────┐ │
│  │  Health Overview                     │  │  Quick Actions   │ │
│  │  ────────────────                    │  │  ────────────    │ │
│  │  Status: ✅ Healthy                   │  │                  │ │
│  │  Uptime: 2h 34m 12s                  │  │  [Restart       │ │
│  │  Last Request: 3s ago                │  │   Browser]      │ │
│  │                                       │  │                  │ │
│  │  Browser: ● Online                   │  │  [Recover       │ │
│  │  Session Age: 45m                    │  │   Session]      │ │
│  │                                       │  │                  │ │
│  │  Memory Usage: 234 MB                │  │  [Start New     │ │
│  │                                       │  │   Chat]         │ │
│  └──────────────────────────────────────┘  │                  │ │
│                                             │  [Refresh       │ │
│  ┌──────────────────┐  ┌─────────────────┐ │   Status]       │ │
│  │  Total Requests  │  │  Success Rate   │ │                  │ │
│  │  ───────────────│  │  ──────────────│ └──────────────────┘ │
│  │                  │  │                 │                      │
│  │      156         │  │     94.2%       │                      │
│  │                  │  │                 │                      │
│  │  [Line Chart]    │  │  [Donut Chart]  │                      │
│  │                  │  │                 │                      │
│  └──────────────────┘  └─────────────────┘                      │
│                                                                  │
│  Recent Activity                                                 │
│  ───────────────                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 14:23:45  POST /v1/chat/completions   ✅ 1.2s   234 chars  │ │
│  │ 14:23:12  POST /v1/chat/completions   ✅ 2.8s   1.2k chars │ │
│  │ 14:22:48  POST /v1/chat/completions   ⚠️  429 Rate Limit   │ │
│  │ 14:22:01  GET  /admin/health          ✅ 12ms             │ │
│  │ 14:21:30  POST /v1/chat/completions   ❌ Session Error     │ │
│  └────────────────────────────────────────────────────────────┘ │
│  [Load More]                                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Features

**Health Overview Panel:**
- Real-time status badge (Healthy/Degraded/Offline)
- Uptime counter (auto-updating)
- Last request timestamp (relative time, e.g., "3s ago")
- Browser status indicator (online/offline)
- Session age (time since last new chat)
- Memory usage (if available from browser API)

**Statistics Cards:**
- **Total Requests**: Line chart showing requests over time (last hour/day)
- **Success Rate**: Donut chart with percentage in center
- **Failed Requests**: Counter with trend indicator
- **Rate Limits**: Counter with warning indicator

**Quick Actions Sidebar:**
- Restart Browser (with confirmation dialog)
- Recover Session (shows recovery level on completion)
- Start New Chat (immediate action)
- Refresh Status (manual refresh trigger)
- All buttons with loading states

**Recent Activity Feed:**
- Real-time list of last 20 requests
- Columns: Time, Method, Endpoint, Status, Duration, Size
- Color-coded status icons (✅ ⚠️ ❌)
- Expandable rows for full request/response details
- Auto-scroll to top on new activity (with pause button)

### Component Breakdown

```tsx
<ServerActivitiesTab>
  <div className="grid grid-cols-[1fr_250px] gap-4">
    <div>
      <HealthOverviewCard>
        <StatusBadge />
        <UptimeCounter />
        <BrowserStatus />
        <SessionAge />
      </HealthOverviewCard>

      <StatisticsGrid>
        <StatsCard title="Total Requests">
          <LineChart data={requestHistory} />
        </StatsCard>
        <StatsCard title="Success Rate">
          <DonutChart data={successRate} />
        </StatsCard>
      </StatisticsGrid>

      <RecentActivityCard>
        <ActivityFeed items={recentRequests} />
        <LoadMoreButton />
      </RecentActivityCard>
    </div>

    <QuickActionsPanel>
      <ActionButton action="restart" />
      <ActionButton action="recover" />
      <ActionButton action="newChat" />
      <ActionButton action="refresh" />
    </QuickActionsPanel>
  </div>
</ServerActivitiesTab>
```

### shadcn/ui Components

- `Card` - All panels and stat cards
- `Badge` - Status indicators
- `Button` - Action buttons
- `Table` - Recent activity list
- `Dialog` - Confirmation dialogs
- `Progress` - Loading indicators
- `Alert` - Error/warning messages
- `Separator` - Visual dividers
- `Collapsible` - Expandable activity rows

### Tailwind Patterns

```css
/* Status badges */
.status-healthy: bg-green-500 text-white
.status-degraded: bg-yellow-500 text-white
.status-offline: bg-red-500 text-white

/* Stats cards */
.stats-card: bg-white dark:bg-gray-900 border rounded-lg p-6 shadow-sm
.stats-value: text-4xl font-bold tabular-nums

/* Activity feed */
.activity-row: grid grid-cols-[80px_60px_1fr_80px_100px_100px] gap-4 p-2 hover:bg-gray-50 dark:hover:bg-gray-800
.activity-time: font-mono text-sm text-gray-500
.activity-status-success: text-green-600
.activity-status-error: text-red-600
.activity-status-warning: text-yellow-600

/* Quick actions */
.action-button: w-full justify-start gap-2 mb-2
```

---

## Tab 3: Logs

### Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│  Logs                                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────┬────────────┬────────────┐  [Search...]  [Clear] │
│  │ [All Logs] │ [Errors]   │ [Warnings] │                       │
│  └────────────┴────────────┴────────────┘                       │
│                                                                  │
│  [Auto-scroll: ON] [Download Logs]                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 14:23:45.123  [server]  Processing prompt (234 chars)...  │ │
│  │ 14:23:46.456  [sessionManager]  Page is alive             │ │
│  │ 14:23:47.789  [server]  Success (1024 chars)              │ │
│  │ 14:24:01.234  [rateLimiter]  No rate limit detected       │ │
│  │ 14:24:05.567  [server]  Request completed in 2.8s         │ │
│  │ 14:24:10.890  [sessionManager]  ⚠️ WARNING: Retry L1       │ │
│  │ 14:24:11.123  [sessionManager]  Recovery successful       │ │
│  │ 14:24:30.456  [server]  ❌ ERROR: Timeout exceeded         │ │
│  │ 14:24:30.457  [server]  Stack trace: ...                  │ │
│  │ 14:25:00.789  [managementController]  Health check OK     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Showing 100 of 1,542 lines  [Load More (500)] [Load All]       │
└─────────────────────────────────────────────────────────────────┘
```

### Features

**Filter Tabs:**
- All Logs (default)
- Errors only (lines with ERROR or ❌)
- Warnings only (lines with WARNING or ⚠️)
- Info (everything else)
- Badge count on each tab

**Search Bar:**
- Real-time filter as you type
- Regex support (optional toggle)
- Clear button
- Match highlighting in results

**Controls:**
- Auto-scroll toggle (on by default, pauses when user scrolls up)
- Download logs button (triggers download of full logs.txt)
- Clear logs button (with confirmation, calls DELETE /admin/logs)
- Refresh button (manual reload)

**Log Display:**
- Monospace font for consistency
- Color-coded by level (info=gray, warning=yellow, error=red)
- Timestamp formatting (HH:MM:SS.mmm)
- Module name in square brackets
- Line numbers on hover
- Copy line on click

**Performance:**
- Virtualized scrolling for large log files (react-window)
- Load logs in chunks (100/500/all)
- Lazy loading as user scrolls

### Component Breakdown

```tsx
<LogsTab>
  <LogsHeader>
    <Tabs>
      <TabsList>
        <TabsTrigger value="all">All Logs <Badge>1542</Badge></TabsTrigger>
        <TabsTrigger value="errors">Errors <Badge>8</Badge></TabsTrigger>
        <TabsTrigger value="warnings">Warnings <Badge>23</Badge></TabsTrigger>
      </TabsList>
    </Tabs>
    <Input placeholder="Search logs..." />
    <Button onClick={clearLogs}>Clear</Button>
  </LogsHeader>

  <LogsControls>
    <Switch checked={autoScroll} onChange={setAutoScroll}>
      Auto-scroll
    </Switch>
    <Button onClick={downloadLogs}>Download Logs</Button>
  </LogsControls>

  <LogsViewer>
    <VirtualizedList>
      {filteredLogs.map(line => (
        <LogLine
          timestamp={line.timestamp}
          module={line.module}
          level={line.level}
          message={line.message}
        />
      ))}
    </VirtualizedList>
  </LogsViewer>

  <LogsFooter>
    <span>Showing {displayed} of {total} lines</span>
    <Button onClick={loadMore}>Load More (500)</Button>
  </LogsFooter>
</LogsTab>
```

### shadcn/ui Components

- `Tabs` - Filter tabs
- `Input` - Search box
- `Button` - Actions (clear, download, load more)
- `Switch` - Auto-scroll toggle
- `Badge` - Count indicators
- `ScrollArea` - Log container
- `Dialog` - Confirmation for clear logs
- `Tooltip` - Line numbers and timestamps

### Tailwind Patterns

```css
/* Log viewer */
.log-viewer: font-mono text-sm bg-gray-950 text-gray-100 p-4 rounded-lg
.log-line: py-1 px-2 hover:bg-gray-900 cursor-pointer transition-colors

/* Log levels */
.log-info: text-gray-400
.log-warning: text-yellow-400
.log-error: text-red-400

/* Log components */
.log-timestamp: text-gray-500 select-none
.log-module: text-blue-400 font-semibold
.log-message: text-gray-200

/* Search highlight */
.search-match: bg-yellow-500 text-black font-bold

/* Controls */
.log-controls: flex items-center gap-4 mb-4
.auto-scroll-switch: data-[state=checked]:bg-green-500
```

---

## Tab 4: Settings

### Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Server Connection                                               │
│  ──────────────────                                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Server URL                                                 │ │
│  │  ───────────                                                │ │
│  │  [http://127.0.0.1:3000]                                    │ │
│  │                                                             │ │
│  │  API Key (Optional)                                         │ │
│  │  ──────────────────                                         │ │
│  │  [••••••••••••••••••••]  [Show]                             │ │
│  │                                                             │ │
│  │  [Test Connection]                                          │ │
│  │  ✅ Connection successful (12ms)                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Dashboard Preferences                                           │
│  ─────────────────────                                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Theme                                                      │ │
│  │  ─────                                                      │ │
│  │  ◉ Dark    ○ Light    ○ System                             │ │
│  │                                                             │ │
│  │  Refresh Interval                                           │ │
│  │  ────────────────                                           │ │
│  │  [Every 5 seconds ▼]                                        │ │
│  │                                                             │ │
│  │  Notifications                                              │ │
│  │  ─────────────                                              │ │
│  │  [✓] Show notifications for errors                         │ │
│  │  [✓] Show notifications for rate limits                    │ │
│  │  [ ] Show notifications for all requests                   │ │
│  │                                                             │ │
│  │  Log Preferences                                            │ │
│  │  ───────────────                                            │ │
│  │  Default log lines: [100]                                   │ │
│  │  [✓] Auto-scroll logs by default                           │ │
│  │  [ ] Enable regex search                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  About                                                           │
│  ─────                                                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  OpenAdapter Dashboard v1.0.0                               │ │
│  │  Server Version: 1.2.0                                      │ │
│  │  Last Updated: 2026-03-02                                   │ │
│  │                                                             │ │
│  │  [View Documentation]  [Report Issue]  [Check for Updates] │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [Reset to Defaults]                           [Save Settings]  │
└─────────────────────────────────────────────────────────────────┘
```

### Features

**Server Connection:**
- Server URL input (with validation)
- Optional API key field (masked, with show/hide toggle)
- Test connection button (pings /admin/health)
- Connection status indicator

**Dashboard Preferences:**
- Theme selector (Dark/Light/System)
- Refresh interval dropdown (2s/5s/10s/30s/manual)
- Notification toggles
- Log display preferences

**Advanced Settings:**
- Timeout configurations (read-only display of server config)
- Debug mode toggle (shows extra info in UI)
- Data retention settings (how long to keep activity history)

**About Section:**
- Dashboard version
- Server version (from /admin/health)
- Links to docs, GitHub, changelog

**Actions:**
- Save settings (persists to localStorage)
- Reset to defaults (with confirmation)
- Export/import settings (JSON download/upload)

### Component Breakdown

```tsx
<SettingsTab>
  <SettingsSection title="Server Connection">
    <Input label="Server URL" value={serverUrl} onChange={setServerUrl} />
    <Input label="API Key" type="password" value={apiKey} onChange={setApiKey} />
    <Button onClick={testConnection}>Test Connection</Button>
    <ConnectionStatus status={connectionStatus} />
  </SettingsSection>

  <SettingsSection title="Dashboard Preferences">
    <RadioGroup label="Theme" options={themeOptions} value={theme} onChange={setTheme} />
    <Select label="Refresh Interval" options={refreshOptions} value={refreshInterval} onChange={setRefreshInterval} />
    <CheckboxGroup label="Notifications" options={notificationOptions} value={notifications} onChange={setNotifications} />
  </SettingsSection>

  <SettingsSection title="About">
    <InfoDisplay label="Dashboard Version" value="1.0.0" />
    <InfoDisplay label="Server Version" value={serverVersion} />
    <ButtonGroup>
      <Button variant="link">View Documentation</Button>
      <Button variant="link">Report Issue</Button>
    </ButtonGroup>
  </SettingsSection>

  <SettingsActions>
    <Button variant="outline" onClick={resetDefaults}>Reset to Defaults</Button>
    <Button onClick={saveSettings}>Save Settings</Button>
  </SettingsActions>
</SettingsTab>
```

### shadcn/ui Components

- `Input` - Text inputs
- `Button` - Actions
- `RadioGroup` - Theme selector
- `Select` - Dropdowns
- `Checkbox` - Toggle options
- `Label` - Form labels
- `Card` - Section containers
- `Separator` - Visual dividers
- `Dialog` - Confirmation dialogs
- `Toast` - Save confirmations

### Tailwind Patterns

```css
/* Settings sections */
.settings-section: mb-8 last:mb-0
.settings-title: text-lg font-semibold mb-4 border-b pb-2

/* Form fields */
.form-field: mb-4 space-y-2
.form-label: text-sm font-medium
.form-description: text-sm text-gray-500

/* Connection status */
.connection-success: text-green-600 flex items-center gap-2
.connection-error: text-red-600 flex items-center gap-2
.connection-testing: text-yellow-600 flex items-center gap-2 animate-pulse

/* Actions bar */
.settings-actions: flex justify-between items-center pt-6 border-t
```

---

## Component Hierarchy

### Full Component Tree

```
<App>
  <ThemeProvider>
    <QueryClientProvider>
      <Layout>
        <Header>
          <Logo />
          <GlobalServerStatus />
          <ThemeToggle />
          <UserMenu />
        </Header>

        <Navigation>
          <NavTabs>
            <NavTab href="/chat" label="Chat" />
            <NavTab href="/activities" label="Server Activities" />
            <NavTab href="/logs" label="Logs" badge={errorCount} />
            <NavTab href="/settings" label="Settings" />
          </NavTabs>
        </Navigation>

        <MainContent>
          <Routes>
            <Route path="/chat" element={<ChatTab />} />
            <Route path="/activities" element={<ServerActivitiesTab />} />
            <Route path="/logs" element={<LogsTab />} />
            <Route path="/settings" element={<SettingsTab />} />
          </Routes>
        </MainContent>

        <Footer>
          <VersionInfo />
          <LastUpdated />
          <ConnectionIndicator />
        </Footer>
      </Layout>

      <ToastContainer />
      <DialogContainer />
    </QueryClientProvider>
  </ThemeProvider>
</App>
```

### Shared Components Library

**Layout Components:**
- `Layout` - Overall page structure
- `Header` - Top navigation bar
- `Footer` - Bottom info bar
- `Sidebar` - Optional side panel

**Display Components:**
- `StatusBadge` - Color-coded status indicator
- `MetricCard` - Stat display card
- `ActivityRow` - Activity feed item
- `LogLine` - Single log entry
- `MessageBubble` - Chat message
- `ToolCallDisplay` - Tool execution UI

**Interactive Components:**
- `ActionButton` - Quick action buttons
- `ConfirmDialog` - Confirmation prompts
- `SearchInput` - Search with clear button
- `FilterTabs` - Tab-based filters
- `RefreshButton` - Manual refresh trigger

**Charts (using Recharts):**
- `LineChart` - Request history
- `DonutChart` - Success rate
- `BarChart` - Error distribution

---

## shadcn/ui Components Needed

### Complete List by Category

**Layout & Structure:**
- `Card` - For all panels and sections
- `Separator` - Visual dividers
- `Tabs` - Tab navigation
- `ScrollArea` - Scrollable containers
- `Collapsible` - Expandable sections

**Forms & Inputs:**
- `Input` - Text inputs
- `Textarea` - Multi-line text
- `Select` - Dropdowns
- `Checkbox` - Toggles
- `RadioGroup` - Single choice
- `Switch` - On/off toggles
- `Label` - Form labels
- `Form` - Form wrapper with validation

**Buttons & Actions:**
- `Button` - All buttons
- `DropdownMenu` - Dropdown actions
- `ContextMenu` - Right-click menus

**Feedback & Status:**
- `Badge` - Count and status indicators
- `Alert` - Warnings and errors
- `Toast` - Notifications
- `Progress` - Loading bars
- `Skeleton` - Loading placeholders
- `Tooltip` - Hover information

**Dialogs & Overlays:**
- `Dialog` - Modal dialogs
- `AlertDialog` - Confirmation dialogs
- `Sheet` - Slide-in panels
- `Popover` - Floating content

**Data Display:**
- `Table` - Activity feed
- `Avatar` - User icons
- `Command` - Command palette (future)

### Installation Command

```bash
npx shadcn-ui@latest add card separator tabs scroll-area collapsible \
  input textarea select checkbox radio-group switch label form \
  button dropdown-menu context-menu \
  badge alert toast progress skeleton tooltip \
  dialog alert-dialog sheet popover \
  table avatar
```

---

## Tailwind CSS Patterns

### Design Tokens

**Colors (extends Tailwind defaults):**
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Status colors
        'status-healthy': '#10b981',  // green-500
        'status-warning': '#f59e0b',  // amber-500
        'status-error': '#ef4444',    // red-500
        'status-offline': '#6b7280',  // gray-500

        // Chat colors
        'chat-user': '#3b82f6',       // blue-500
        'chat-assistant': '#10b981',  // green-500
        'chat-tool': '#f59e0b',       // amber-500
      },
    },
  },
}
```

**Spacing:**
- Use Tailwind's default spacing scale
- Consistent gap of `gap-4` for most grids
- Padding `p-6` for cards, `p-4` for smaller containers

**Typography:**
```css
/* Code/monospace elements */
.font-code: font-mono text-sm

/* Section headings */
.section-heading: text-lg font-semibold mb-4

/* Metric values */
.metric-value: text-4xl font-bold tabular-nums
.metric-label: text-sm text-gray-500 uppercase tracking-wide
```

### Common Patterns

**Card Pattern:**
```jsx
<Card className="bg-white dark:bg-gray-900 border rounded-lg shadow-sm">
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

**Status Badge Pattern:**
```jsx
<Badge className={cn(
  "flex items-center gap-1",
  status === "healthy" && "bg-green-500 text-white",
  status === "warning" && "bg-yellow-500 text-white",
  status === "error" && "bg-red-500 text-white"
)}>
  <span className="w-2 h-2 rounded-full bg-current" />
  {status}
</Badge>
```

**Grid Layout Pattern:**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid items */}
</div>
```

**Hover Effects:**
```css
/* Interactive rows */
.interactive-row: hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors

/* Buttons */
.button-hover: hover:scale-105 transition-transform active:scale-95
```

---

## State Management Architecture

### Overview

**Philosophy:**
- Server state managed by React Query
- UI state managed by React hooks (useState, useReducer)
- Global settings in localStorage + React Context
- Real-time updates via polling or WebSocket

### React Query Structure

**Query Keys:**
```ts
const queryKeys = {
  health: ['health'],
  status: ['status'],
  logs: (lines: number) => ['logs', lines],
  config: ['config'],
  recentActivity: (limit: number) => ['activity', limit],
}
```

**Query Hooks:**
```tsx
// Health data (refetch every 5s)
const { data: health, isLoading, error } = useQuery({
  queryKey: queryKeys.health,
  queryFn: () => fetch('/admin/health').then(r => r.json()),
  refetchInterval: 5000,
})

// Logs (manual refetch only)
const { data: logs, refetch: refreshLogs } = useQuery({
  queryKey: queryKeys.logs(100),
  queryFn: () => fetch('/admin/logs?lines=100').then(r => r.json()),
  refetchInterval: false,
})

// Recent activity (real-time updates)
const { data: activity } = useQuery({
  queryKey: queryKeys.recentActivity(20),
  queryFn: getRecentActivity,
  refetchInterval: 2000, // Fast polling for activity feed
})
```

**Mutation Hooks:**
```tsx
// Restart browser
const restartMutation = useMutation({
  mutationFn: () => fetch('/admin/session/restart', { method: 'POST' }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.health })
    toast.success('Browser restarted successfully')
  },
  onError: (error) => {
    toast.error(`Restart failed: ${error.message}`)
  },
})

// Clear logs
const clearLogsMutation = useMutation({
  mutationFn: () => fetch('/admin/logs', { method: 'DELETE' }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.logs() })
  },
})
```

### Settings Context

**Settings Provider:**
```tsx
const SettingsContext = createContext<Settings>({})

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState<Settings>(() => {
    // Load from localStorage
    return loadSettings()
  })

  useEffect(() => {
    // Save to localStorage on change
    saveSettings(settings)
  }, [settings])

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
```

**Settings Shape:**
```ts
interface Settings {
  serverUrl: string
  apiKey?: string
  theme: 'dark' | 'light' | 'system'
  refreshInterval: number // ms
  notifications: {
    errors: boolean
    rateLimits: boolean
    allRequests: boolean
  }
  logs: {
    defaultLines: number
    autoScroll: boolean
    regexSearch: boolean
  }
}
```

### Vercel AI SDK Integration

**Chat State (useChat hook):**
```tsx
import { useChat } from 'ai/react'

export function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    onError: (error) => {
      toast.error(`Chat error: ${error.message}`)
    },
    onFinish: (message) => {
      // Invalidate health queries after tool calls
      if (message.toolInvocations) {
        queryClient.invalidateQueries({ queryKey: queryKeys.health })
      }
    },
  })

  return (
    <div>
      <MessageList messages={messages} />
      <ChatInput
        value={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        disabled={isLoading}
      />
    </div>
  )
}
```

**Tool Calling:**
```tsx
// In /api/chat/route.ts
import { openai } from '@ai-sdk/openai'
import { streamText, tool } from 'ai'
import { z } from 'zod'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: openai('gpt-4'),
    messages,
    tools: {
      getServerHealth: tool({
        description: 'Get OpenAdapter server health status',
        parameters: z.object({}),
        execute: async () => {
          const res = await fetch('http://127.0.0.1:3000/admin/health')
          return res.json()
        },
      }),
      restartBrowser: tool({
        description: 'Restart the browser session',
        parameters: z.object({}),
        execute: async () => {
          const res = await fetch('http://127.0.0.1:3000/admin/session/restart', {
            method: 'POST',
          })
          return res.json()
        },
      }),
      // ... more tools
    },
  })

  return result.toDataStreamResponse()
}
```

---

## Real-Time Updates Strategy

### Approach Comparison

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **Polling** | Simple, works everywhere | Higher latency, more requests | Health checks, stats |
| **WebSocket** | Real-time, efficient | More complex, needs infrastructure | Activity feed, logs |
| **SSE** | Server-push, simpler than WS | One-way only | Log streaming |

### Recommended Strategy

**Hybrid Approach:**

1. **Polling for periodic data** (5-10s interval)
   - Health status
   - Statistics
   - Configuration

2. **Fast polling for activity feed** (2s interval)
   - Recent requests
   - Real-time status changes

3. **SSE for log streaming** (future enhancement)
   - Tail logs in real-time
   - Push new log lines as they're written

### Implementation

**React Query Polling:**
```tsx
// Automatic refetch every 5s
const { data: health } = useQuery({
  queryKey: ['health'],
  queryFn: fetchHealth,
  refetchInterval: 5000,
  refetchIntervalInBackground: true, // Continue polling when tab is hidden
})
```

**Manual Refresh Button:**
```tsx
function RefreshButton() {
  const queryClient = useQueryClient()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['health'] })
    queryClient.invalidateQueries({ queryKey: ['activity'] })
  }

  return (
    <Button onClick={handleRefresh} size="sm" variant="outline">
      <RefreshIcon className="w-4 h-4" />
    </Button>
  )
}
```

**WebSocket (Future):**
```tsx
// Future implementation
useEffect(() => {
  const ws = new WebSocket('ws://127.0.0.1:3000/ws')

  ws.onmessage = (event) => {
    const update = JSON.parse(event.data)

    // Update React Query cache directly
    queryClient.setQueryData(['activity'], (old) => {
      return [update, ...old].slice(0, 20)
    })
  }

  return () => ws.close()
}, [])
```

### Performance Considerations

**Optimizations:**
- Pause polling when tab is hidden (use `refetchIntervalInBackground: false`)
- Use stale-while-revalidate pattern (show cached data immediately)
- Debounce rapid updates (e.g., activity feed)
- Limit activity history to last 100 items (pagination for more)

**Bandwidth:**
- Health endpoint: ~1KB per request
- At 5s interval: ~12KB/min, ~720KB/hour
- Acceptable for local dashboard

---

## Mobile Responsiveness

### Breakpoints

```js
// Tailwind breakpoints
sm: '640px',   // Small tablets, large phones
md: '768px',   // Tablets
lg: '1024px',  // Laptops
xl: '1280px',  // Desktops
2xl: '1536px', // Large desktops
```

### Responsive Layout Patterns

**Tab Navigation:**
```jsx
// Desktop: Horizontal tabs
// Mobile: Vertical stack or bottom nav

<Tabs className="w-full">
  {/* Desktop */}
  <TabsList className="hidden md:flex">
    <TabsTrigger>Chat</TabsTrigger>
    <TabsTrigger>Activities</TabsTrigger>
    <TabsTrigger>Logs</TabsTrigger>
    <TabsTrigger>Settings</TabsTrigger>
  </TabsList>

  {/* Mobile: Bottom navigation */}
  <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t">
    <nav className="grid grid-cols-4 gap-1 p-2">
      <NavButton icon={<ChatIcon />} label="Chat" />
      <NavButton icon={<ActivityIcon />} label="Activity" />
      <NavButton icon={<LogsIcon />} label="Logs" />
      <NavButton icon={<SettingsIcon />} label="Settings" />
    </nav>
  </div>
</Tabs>
```

**Server Activities Grid:**
```jsx
// Desktop: 2-column layout (main + sidebar)
// Tablet: Single column
// Mobile: Stacked cards

<div className="grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-4">
  <div className="space-y-4">
    {/* Health, stats, activity */}
  </div>
  <aside className="lg:sticky lg:top-4">
    {/* Quick actions */}
  </aside>
</div>
```

**Stats Cards:**
```jsx
// Desktop: 2x2 grid
// Tablet: 2 columns
// Mobile: Single column

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
  <StatsCard title="Total Requests" />
  <StatsCard title="Success Rate" />
  <StatsCard title="Failed Requests" />
  <StatsCard title="Rate Limits" />
</div>
```

**Chat Interface:**
```jsx
// Mobile: Full screen, hidden header
// Desktop: Normal layout

<div className="flex flex-col h-[calc(100vh-200px)] md:h-[600px]">
  <ScrollArea className="flex-1 p-4">
    <MessageList />
  </ScrollArea>
  <div className="border-t p-4">
    <ChatInput />
  </div>
</div>
```

### Touch Optimizations

**Button Sizes:**
```css
/* Mobile: Larger touch targets (min 44px) */
.mobile-button: min-h-[44px] px-6

/* Desktop: Normal sizes */
.desktop-button: h-10 px-4
```

**Gesture Support:**
- Swipe to dismiss notifications
- Pull-to-refresh on activity feed
- Swipe between tabs (future enhancement)

---

## Accessibility Considerations

### WCAG 2.1 AA Compliance

**Color Contrast:**
- All text meets 4.5:1 contrast ratio
- Status colors work in both light and dark modes
- Color is not the only indicator (use icons + text)

**Keyboard Navigation:**
- All interactive elements focusable
- Tab order follows visual layout
- Skip links for main content
- Focus indicators clearly visible

**Screen Reader Support:**
```jsx
// Semantic HTML
<main aria-label="Dashboard">
  <section aria-labelledby="activities-heading">
    <h2 id="activities-heading">Server Activities</h2>
    {/* Content */}
  </section>
</main>

// ARIA labels
<Button aria-label="Restart browser session">
  <RestartIcon />
</Button>

// Live regions for updates
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

**Focus Management:**
```tsx
// Focus trap in dialogs
<Dialog>
  <DialogContent>
    <DialogTitle>Confirm Restart</DialogTitle>
    <DialogDescription>
      This will restart the browser session.
    </DialogDescription>
    <DialogActions>
      <Button autoFocus>Cancel</Button>
      <Button>Confirm</Button>
    </DialogActions>
  </DialogContent>
</Dialog>
```

### Keyboard Shortcuts (Future)

```
Ctrl/Cmd + K: Open command palette
Ctrl/Cmd + R: Refresh data
Ctrl/Cmd + L: Focus log search
Ctrl/Cmd + /: Open help
1-4: Switch between tabs
Esc: Close dialogs/panels
```

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Set up Next.js project with App Router
- [ ] Install and configure Tailwind CSS
- [ ] Set up shadcn/ui components
- [ ] Create layout structure (Header, Footer, Nav)
- [ ] Implement theme provider (dark/light)
- [ ] Set up React Query
- [ ] Create settings context and localStorage persistence

### Phase 2: Server Activities Tab
- [ ] Implement health overview card
- [ ] Create statistics cards with Recharts
- [ ] Build recent activity feed
- [ ] Add quick actions panel
- [ ] Implement polling for real-time updates
- [ ] Add error handling and loading states

### Phase 3: Logs Tab
- [ ] Create log viewer with virtualized scrolling
- [ ] Implement filter tabs (All, Errors, Warnings)
- [ ] Add search functionality
- [ ] Build auto-scroll toggle
- [ ] Add download/clear logs actions
- [ ] Implement log parsing and formatting

### Phase 4: Settings Tab
- [ ] Create server connection settings
- [ ] Build theme selector
- [ ] Add notification preferences
- [ ] Implement settings persistence
- [ ] Add test connection feature
- [ ] Create about section

### Phase 5: Chat Tab (Vercel AI SDK)
- [ ] Set up Vercel AI SDK
- [ ] Create /api/chat route
- [ ] Implement tool schemas for server management
- [ ] Build chat interface with useChat hook
- [ ] Add message display with tool call visualization
- [ ] Implement quick action buttons
- [ ] Add file attachment support

### Phase 6: Polish
- [ ] Add loading skeletons
- [ ] Implement error boundaries
- [ ] Add toast notifications
- [ ] Optimize performance (memoization, lazy loading)
- [ ] Test mobile responsiveness
- [ ] Accessibility audit
- [ ] Write documentation

---

## Conclusion

This design provides a comprehensive, production-ready blueprint for the OpenAdapter dashboard. The UI/UX focuses on clarity, real-time awareness, and developer productivity while maintaining a clean, modern aesthetic.

**Key Strengths:**
- Clear information hierarchy
- Real-time monitoring without overwhelming the user
- Powerful AI assistant for server management
- Comprehensive logging and debugging tools
- Flexible settings and customization
- Mobile-responsive and accessible

**Next Steps:**
1. Review and approve this design
2. Create detailed component specifications
3. Begin implementation with Phase 1 (Foundation)
4. Iterate based on user feedback

---

**Status:** ✅ Design Complete
**Ready for:** Implementation Phase
