'use client'

import { useWebSocket } from '@/hooks/useWebSocket';
import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "../../components/app-sidebar"
import { redirect } from 'next/dist/server/api-utils';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();

  const { agents, metrics, isConnected, sendCommand } = useWebSocket('ws://localhost:3000/ws');

  const onAgentSelect = (agentId: string) => {
    router.push(`/agent/${agentId}`);
  };
  console.log(agents)
    return (
      <SidebarProvider>
        <AppSidebar isConnected={isConnected} agents={agents} metrics={metrics} onAgentSelect={onAgentSelect} >

        </AppSidebar>
      </SidebarProvider>
    )
}
