'use client';

import { useWebSocket } from '../../hooks/useWebSocket';
import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function Dashboard() {
  const { agents, metrics, isConnected, sendCommand } = useWebSocket('ws://localhost:3000/ws');
  const [selectedAgent, setSelectedAgent] = useState(null);
  
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };
  
  const formatMetricValue = (value) => {
    if (typeof value === 'object' && value !== null) {
      if (value.error) {
        return <span className="error">Error: {value.error}</span>;
      }
      return JSON.stringify(value, null, 2);
    }
    return value;
  };
  
  const renderCpuMetrics = (cpu) => {
    if (!cpu) return <p>No CPU data</p>;
    
    if (cpu.error) {
      return <p className="error">CPU Error: {cpu.error}</p>;
    }
    
    return (
      <div className="metric-details">
        {Object.entries(cpu).map(([key, value]) => (
          <div key={key} className="metric-row">
            <span className="metric-label">{key}:</span>
            <span className="metric-value">{value}</span>
          </div>
        ))}
      </div>
    );
  };
  
  const renderGpuMetrics = (gpu) => {
    if (!gpu) return <p>No GPU data</p>;
    
    if (!gpu.available) {
      return <p className="warning">GPU not available</p>;
    }
    
    return (
      <div className="metric-details">
        <div className="metric-row">
          <span className="metric-label">Utilization:</span>
          <span className="metric-value">{gpu.utilization}%</span>
        </div>
        <div className="metric-row">
          <span className="metric-label">Temperature:</span>
          <span className="metric-value">{gpu.temperature}°C</span>
        </div>
        <div className="metric-row">
          <span className="metric-label">Memory Used:</span>
          <span className="metric-value">{gpu.memory_used} MB</span>
        </div>
        <div className="metric-row">
          <span className="metric-label">Power Draw:</span>
          <span className="metric-value">{gpu.power_draw} W</span>
        </div>
      </div>
    );
  };
  
  const renderMemoryMetrics = (memory) => {
    if (!memory) return <p>No memory data</p>;
    
    if (memory.error) {
      return <p className="error">Memory Error: {memory.error}</p>;
    }
    
    return (
      <div className="metric-details">
        <div className="metric-grid">
          {Object.entries(memory).slice(0, 8).map(([key, value]) => (
            <div key={key} className="metric-item">
              <div className="metric-label">{key}</div>
              <div className="metric-value">{value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const renderTemperatures = (temps) => {
    if (!temps) return <p>No temperature data</p>;
    
    if (temps.error) {
      return <p className="error">Temperature Error: {temps.error}</p>;
    }
    
    return (
      <div className="metric-details">
        {Object.entries(temps).map(([sensor, data]) => (
          <div key={sensor} className="temp-sensor">
            <h5>{sensor}</h5>
            <div className="temp-readings">
              {Object.entries(data).map(([reading, value]) => (
                <div key={reading} className="metric-row">
                  <span className="metric-label">{reading}:</span>
                  <span className="metric-value">{formatMetricValue(value)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="dashboard">
      {/* <header className="dashboard-header"> */}
      {/*   <h1>Device Agent Dashboard</h1> */}
      {/*   <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}> */}
      {/*     {isConnected ? '🟢 Connected' : '🔴 Disconnected'} */}
      {/*   </div> */}
      {/* </header> */}
     <SidebarProvider>
       <AppSidebar>
         <main>
           <SidebarTrigger/>
         </main>
       </AppSidebar>
     </SidebarProvider>
      <div className="dashboard-content">
        <div className="agents-sidebar">
          <h2>Connected Agents ({agents.length})</h2>
          {agents.length === 0 ? (
            <div className="no-agents">
              <p>No agents connected</p>
              <small>Make sure your Python agents are running and can connect to the server</small>
            </div>
          ) : (
            <div className="agents-list">
              {agents.map(agent => (
                <div 
                  key={agent.agentId} 
                  className={`agent-item ${selectedAgent === agent.agentId ? 'selected' : ''}`}
                  onClick={() => setSelectedAgent(agent.agentId)}
                >
                  <div className="agent-info">
                    <h3>{agent.agentId}</h3>
                    <div className="agent-status">
                      <span className={`status-dot ${metrics[agent.agentId] ? 'active' : 'inactive'}`}></span>
                      {metrics[agent.agentId] ? 'Sending metrics' : 'No metrics'}
                    </div>
                    <small>Last seen: {new Date(agent.lastSeen).toLocaleString()}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="metrics-main">
          {selectedAgent ? (
            <div className="agent-details">
              <div className="agent-header">
                <h2>Agent: {selectedAgent}</h2>
                {metrics[selectedAgent] && (
                  <small>
                    Last update: {formatTimestamp(metrics[selectedAgent].timestamp)}
                  </small>
                )}
              </div>
              
              {metrics[selectedAgent] ? (
                <div className="metrics-grid">
                  <div className="metric-card">
                    <h3>CPU Metrics</h3>
                    {renderCpuMetrics(metrics[selectedAgent].cpu)}
                  </div>
                  
                  <div className="metric-card">
                    <h3>GPU Metrics</h3>
                    {renderGpuMetrics(metrics[selectedAgent].gpu)}
                  </div>
                  
                  <div className="metric-card">
                    <h3>Memory Usage</h3>
                    {renderMemoryMetrics(metrics[selectedAgent].memory)}
                  </div>
                  
                  <div className="metric-card">
                    <h3>Temperature Sensors</h3>
                    {renderTemperatures(metrics[selectedAgent].temps)}
                  </div>
                </div>
              ) : (
                <div className="no-metrics">
                  <p>No metrics available for this agent</p>
                  <small>The agent may still be initializing or experiencing issues</small>
                </div>
              )}
            </div>
          ) : (
            <div className="no-selection">
              <h2>Select an agent to view metrics</h2>
              <p>Choose an agent from the sidebar to see real-time system metrics</p>
            </div>
          )}
        </div>
      </div>
      
{/*       <style jsx>{` */}
{/*         .dashboard { */}
{/*           min-height: 100vh; */}
{/*           background: #f5f7fa; */}
{/*         } */}

{/*         .dashboard-header { */}
{/*           background: white; */}
{/*           padding: 20px; */}
{/*           border-bottom: 1px solid #e1e5e9; */}
{/*           display: flex; */}
{/*           justify-content: space-between; */}
{/*           align-items: center; */}
{/*         } */}

{/*         .dashboard-header h1 { */}
{/*           margin: 0; */}
{/*           color: #2d3748; */}
{/*         } */}

{/*         .connection-status { */}
{/*           padding: 8px 16px; */}
{/*           border-radius: 20px; */}
{/*           font-weight: bold; */}
{/*           font-size: 14px; */}
{/*         } */}

{/*         .connection-status.connected { */}
{/*           background: #c6f6d5; */}
{/*           color: #22543d; */}
{/*         } */}

{/*         .connection-status.disconnected { */}
{/*           background: #fed7d7; */}
{/*           color: #742a2a; */}
{/*         } */}

{/*         .dashboard-content { */}
{/*           display: flex; */}
{/*           height: calc(100vh - 80px); */}
{/*         } */}

{/*         .agents-sidebar { */}
{/*           width: 320px; */}
{/*           background: white; */}
{/*           border-right: 1px solid #e1e5e9; */}
{/*           padding: 20px; */}
{/*           overflow-y: auto; */}
{/*         } */}

{/*         .agents-sidebar h2 { */}
{/*           margin: 0 0 20px 0; */}
{/*           color: #2d3748; */}
{/*           font-size: 18px; */}
{/*         } */}

{/*         .no-agents { */}
{/*           text-align: center; */}
{/*           padding: 40px 20px; */}
{/*           color: #718096; */}
{/*         } */}

{/*         .no-agents small { */}
{/*           display: block; */}
{/*           margin-top: 8px; */}
{/*           font-size: 12px; */}
{/*         } */}

{/*         .agents-list { */}
{/*           display: flex; */}
{/*           flex-direction: column; */}
{/*           gap: 12px; */}
{/*         } */}

{/*         .agent-item { */}
{/*           border: 1px solid #e2e8f0; */}
{/*           border-radius: 8px; */}
{/*           padding: 16px; */}
{/*           cursor: pointer; */}
{/*           transition: all 0.2s; */}
{/*           background: white; */}
{/*         } */}

{/*         .agent-item:hover { */}
{/*           border-color: #cbd5e0; */}
{/*           box-shadow: 0 2px 4px rgba(0,0,0,0.1); */}
{/*         } */}

{/*         .agent-item.selected { */}
{/*           border-color: #3182ce; */}
{/*           background: #ebf8ff; */}
{/*         } */}

{/*         .agent-info h3 { */}
{/*           margin: 0 0 8px 0; */}
{/*           color: #2d3748; */}
{/*           font-size: 16px; */}
{/*         } */}

{/*         .agent-status { */}
{/*           display: flex; */}
{/*           align-items: center; */}
{/*           gap: 8px; */}
{/*           margin-bottom: 4px; */}
{/*           font-size: 14px; */}
{/*           color: #4a5568; */}
{/*         } */}

{/*         .status-dot { */}
{/*           width: 8px; */}
{/*           height: 8px; */}
{/*           border-radius: 50%; */}
{/*         } */}

{/*         .status-dot.active { */}
{/*           background: #48bb78; */}
{/*         } */}

{/*         .status-dot.inactive { */}
{/*           background: #a0aec0; */}
{/*         } */}

{/*         .agent-info small { */}
{/*           color: #718096; */}
{/*           font-size: 12px; */}
{/*         } */}

{/*         .metrics-main { */}
{/*           flex: 1; */}
{/*           padding: 20px; */}
{/*           overflow-y: auto; */}
{/*         } */}

{/*         .agent-header { */}
{/*           margin-bottom: 24px; */}
{/*         } */}

{/*         .agent-header h2 { */}
{/*           margin: 0 0 4px 0; */}
{/*           color: #2d3748; */}
{/*         } */}

{/*         .agent-header small { */}
{/*           color: #718096; */}
{/*         } */}

{/*         .metrics-grid { */}
{/*           display: grid; */}
{/*           grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); */}
{/*           gap: 20px; */}
{/*         } */}

{/*         .metric-card { */}
{/*           background: white; */}
{/*           border-radius: 8px; */}
{/*           padding: 20px; */}
{/*           border: 1px solid #e2e8f0; */}
{/*         } */}

{/* .metric-card h3 { */}
{/*           margin: 0 0 16px 0; */}
{/*           color: #2d3748; */}
{/*           font-size: 16px; */}
{/*         } */}

{/*         .metric-details { */}
{/*           font-size: 14px; */}
{/*         } */}

{/*         .metric-row { */}
{/*           display: flex; */}
{/*           justify-content: space-between; */}
{/*           margin-bottom: 8px; */}
{/*           padding: 4px 0; */}
{/*           border-bottom: 1px solid #f7fafc; */}
{/*         } */}

{/*         .metric-label { */}
{/*           font-weight: 500; */}
{/*           /\* color: #4a5568; *\/ */}
{/*         } */}

{/*         .metric-value { */}
{/*           /\* color: #2d3748; *\/ */}
{/*           font-family: monospace; */}
{/*         } */}

{/*         .metric-grid { */}
{/*           display: grid; */}
{/*           grid-template-columns: repeat(2, 1fr); */}
{/*           gap: 12px; */}
{/*         } */}

{/*         .metric-item { */}
{/*           padding: 8px; */}
{/*           background: #f7fafc; */}
{/*           border-radius: 4px; */}
{/*         } */}

{/*         .temp-sensor { */}
{/*           margin-bottom: 16px; */}
{/*         } */}

{/*         .temp-sensor h5 { */}
{/*           margin: 0 0 8px 0; */}
{/*           color: #2d3748; */}
{/*           font-size: 14px; */}
{/*         } */}

{/*         .error { */}
{/*           color: #e53e3e; */}
{/*         } */}

{/*         .warning { */}
{/*           color: #d69e2e; */}
{/*         } */}

{/*         .no-selection, .no-metrics { */}
{/*           text-align: center; */}
{/*           padding: 60px 20px; */}
{/*           color: #718096; */}
{/*         } */}

{/*         .no-selection h2, .no-metrics p { */}
{/*           color: #4a5568; */}
{/*         } */}
{/*       `}</style> */}
    </div>
  );
}
