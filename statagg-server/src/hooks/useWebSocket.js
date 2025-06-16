import { useState, useEffect, useRef } from 'react';

export function useWebSocket(url) {
  const [agents, setAgents] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('Connected to WebSocket server');
        setIsConnected(true);
        
        // Subscribe as a client to receive updates
        ws.send(JSON.stringify({
          type: 'client_subscribe',
          agentId: 'webclient'
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('Disconnected from WebSocket server');
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url]);
  
  const handleMessage = (message) => {
    switch (message.type) {
      case 'agent_list':
        setAgents(message.agents);
        break;
        
      case 'agent_connected':
        setAgents(prev => {
          const exists = prev.find(agent => agent.agentId === message.agentId);
          if (!exists) {
            return [...prev, {
              agentId: message.agentId,
              lastSeen: message.timestamp,
              hasMetrics: false
            }];
          }
          return prev;
        });
        break;
        
      case 'agent_disconnected':
        setAgents(prev => prev.filter(agent => agent.agentId !== message.agentId));
        setMetrics(prev => {
          const updated = { ...prev };
          delete updated[message.agentId];
          return updated;
        });
        break;
        
      case 'metrics_update':
        setMetrics(prev => ({
          ...prev,
          [message.agentId]: message.metrics
        }));
        
        // Update agent's hasMetrics status
        setAgents(prev => prev.map(agent => 
          agent.agentId === message.agentId 
            ? { ...agent, hasMetrics: true, lastSeen: message.timestamp }
            : agent
        ));
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  };
  
  const sendCommand = (agentId, command) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'command',
        agentId,
        command
      }));
    }
  };
  
  return {
    agents,
    metrics,
    isConnected,
    sendCommand
  };
}
