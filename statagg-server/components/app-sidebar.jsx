'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Monitor, Activity, Zap } from "lucide-react"

export function AppSidebar({ agents, metrics, isConnected, onAgentSelect, ...props }) {

  // agents = agents.filter(obj => obj.agentId == "webclient");
  console.log(agents)

  return (
    <Sidebar variant="floating" collapsible="none" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <Monitor className="h-6 w-6" />
          <span className="font-semibold">Device Monitor</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Connected Agents ({agents.length})</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {agents.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  <Monitor className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No agents connected</p>
                  <p className="text-xs mt-1">Start your Python agents</p>
                </div>
              ) : (
                agents.map((agent) => (
                  <SidebarMenuItem key={agent.agentId}>
                    <SidebarMenuButton
                      onClick={() => onAgentSelect(agent.agentId)}
                      className="w-full"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            metrics[agent.agentId] ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm truncate">
                            {agent.agentId}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {metrics[agent.agentId] ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-4 py-2">
          <div className={`flex items-center gap-2 text-sm ${
            isConnected ? 'text-green-600' : 'text-red-600'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <Zap className="h-4 w-4" />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
