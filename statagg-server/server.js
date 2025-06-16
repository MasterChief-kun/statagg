const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const WebSocket = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store connected agents
const connectedAgents = new Map();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Create WebSocket server
  const wss = new WebSocket.Server({ server, path: '/ws' });

  function broadcastToClients(message) {
    wss.clients.forEach((client) => {
      if (client.isClient && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection established');

    ws.agentId = null;
    ws.isClient = false;
    ws.lastSeen = new Date();

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received message:', message);

        switch (message.type) {
          case 'register':
            ws.agentId = message.agentId;
            connectedAgents.set(message.agentId, {
              ws: ws,
              lastSeen: new Date(),
              metrics: null
            });
            console.log(`Agent ${message.agentId} registered`);

            // Send confirmation
            ws.send(JSON.stringify({
              type: 'registration_confirmed',
              agentId: message.agentId,
              timestamp: new Date().toISOString()
            }));

            // Notify web clients of new agent
            broadcastToClients({
              type: 'agent_connected',
              agentId: message.agentId,
              timestamp: Date.now()
            });
            break;

          case 'metrics':
            if (connectedAgents.has(message.agentId)) {
              const agent = connectedAgents.get(message.agentId);
              agent.metrics = message;
              agent.lastSeen = new Date();
              console.log(`Metrics received from ${message.agentId}`);

              // Broadcast to web clients
              broadcastToClients({
                type: 'metrics_update',
                agentId: message.agentId,
                metrics: {
                  cpu: message.cpu,
                  gpu: message.gpu,
                  memory: message.memory,
                  temps: message.temps,
                  timestamp: message.timestamp
                }
              });
            }
            break;

          case 'client_subscribe':
            ws.isClient = true;
            console.log('Web client subscribed');

            // Send current agent list to new client
            const agentList = Array.from(connectedAgents.entries()).map(([agentId, agent]) => ({
              agentId,
              lastSeen: agent.lastSeen.getTime(),
              hasMetrics: !!agent.metrics
            }));

            ws.send(JSON.stringify({
              type: 'agent_list',
              agents: agentList
            }));
            break;

          case 'command':
            const { agentId, command } = message;
            if (connectedAgents.has(agentId)) {
              const agent = connectedAgents.get(agentId);
              agent.ws.send(JSON.stringify({
                type: 'command',
                command,
                timestamp: Date.now()
              }));
              console.log(`Command sent to agent ${agentId}:`, command);
            }
            break;

          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    ws.on('close', () => {
      if (ws.agentId) {
        connectedAgents.delete(ws.agentId);
        console.log(`Agent ${ws.agentId} disconnected`);

        // Notify web clients
        broadcastToClients({
          type: 'agent_disconnected',
          agentId: ws.agentId,
          timestamp: Date.now()
        });
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Cleanup disconnected agents
  setInterval(() => {
    const now = new Date();
    for (const [agentId, agent] of connectedAgents.entries()) {
      if (now - agent.lastSeen > 30000) { // 30 seconds timeout
        console.log(`Agent ${agentId} timed out`);
        connectedAgents.delete(agentId);

        // Notify web clients
        broadcastToClients({
          type: 'agent_disconnected',
          agentId: agentId,
          timestamp: Date.now()
        });
      }
    }
  }, 10000);

  // Make agents data available globally
  global.connectedAgents = connectedAgents;

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server ready on ws://${hostname}:${port}/ws`);
  });
});
