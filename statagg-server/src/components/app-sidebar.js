import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar"



export function AppSidebar(props) {
    return (
        <Sidebar>
          <SidebarContent>

          </SidebarContent>

          <SidebarFooter>
           <span>
             {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
           </span>
          </SidebarFooter>
        </Sidebar>
    )
}
