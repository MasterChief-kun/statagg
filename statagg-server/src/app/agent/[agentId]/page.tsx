'use client';

import { useParams } from 'next/navigation';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface HistoricalData {
  timestamp: number;
  cpu: number;
  memory: number;
  gpu?: number;
  cpuTemp: number;
  gpuTemp?: number;
  cpuPower: number;
  gpuPower?: number;
}

export default function AgentPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  const { agents, metrics, sendCommand, isConnected } = useWebSocket('ws://localhost:3000/ws');

  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [maxDataPoints] = useState(50); // Keep last 50 data points

  // Get the specific agent and its metrics
  const agent = agents.find((a: any) => a.agentId === agentId);
  const agentMetrics = metrics[agentId];
  const isOnline = !!agent;

  // Update historical data when new metrics arrive
  useEffect(() => {
    if (agentMetrics) {
      const newDataPoint: HistoricalData = {
        timestamp: agentMetrics.timestamp * 1000, // Convert to milliseconds
        cpu: parseFloat(agentMetrics.cpu?.PkgWatt || '0'),
        memory: agentMetrics.memory ?
          (parseFloat(agentMetrics.memory['K used memory']) / parseFloat(agentMetrics.memory['K total memory'])) * 100 : 0,
        gpu: agentMetrics.gpu?.utilization ? parseFloat(agentMetrics.gpu.utilization) : undefined,
        cpuTemp: agentMetrics.temps?.['coretemp-isa-0000']?.['Package id 0']?.temp1_input || 0,
        gpuTemp: agentMetrics.gpu?.temperature ? parseFloat(agentMetrics.gpu.temperature) : undefined,
        cpuPower: parseFloat(agentMetrics.cpu?.PkgWatt || '0'),
        gpuPower: agentMetrics.gpu?.power_draw ? parseFloat(agentMetrics.gpu.power_draw) : undefined
      };

      setHistoricalData(prev => {
        const updated = [...prev, newDataPoint];
        return updated.slice(-maxDataPoints); // Keep only last N points
      });
    }
  }, [agentMetrics, maxDataPoints]);

  const handleCommand = (command: string) => {
    sendCommand(agentId, command);
  };

  // Format memory data for display
  const formatMemoryData = () => {
    if (!agentMetrics?.memory) return null;

    const total = parseFloat(agentMetrics.memory['K total memory']);
    const used = parseFloat(agentMetrics.memory['K used memory']);
    const free = parseFloat(agentMetrics.memory['K free memory']);
    const buffer = parseFloat(agentMetrics.memory['K buffer memory'] || '0');
    const cache = parseFloat(agentMetrics.memory['K swap cache'] || '0');

    return [
      { name: 'Used', value: used, color: '#8884d8' },
      { name: 'Free', value: free, color: '#82ca9d' },
      { name: 'Buffer', value: buffer, color: '#ffc658' },
      { name: 'Cache', value: cache, color: '#ff7c7c' }
    ];
  };

  // Format temperature data
  const getTemperatureData = () => {
    if (!agentMetrics?.temps) return [];

    const tempData: Array<{name: string, temp: number, max?: number}> = [];

    Object.entries(agentMetrics.temps).forEach(([sensorName, sensorData]: [string, any]) => {
      if (sensorData.Adapter) {
        Object.entries(sensorData).forEach(([key, value]: [string, any]) => {
          if (typeof value === 'object' && value.temp1_input !== undefined) {
            tempData.push({
              name: `${sensorName}-${key}`,
              temp: value.temp1_input,
              max: value.temp1_max
            });
          }
          if (typeof value === 'object' && value.temp2_input !== undefined) {
            tempData.push({
              name: `${sensorName}-${key}`,
              temp: value.temp2_input,
              max: value.temp2_max
            });
          }
        });
      }
    });

    return tempData.slice(0, 10); // Limit to first 10 sensors
  };

  if (!isConnected) {
    return <div className="p-6">Connecting to server...</div>;
  }

  if (!isOnline) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Agent: {agentId}</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Agent is offline or not found
        </div>
      </div>
    );
  }

  const memoryData = formatMemoryData();
  const temperatureData = getTemperatureData();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Agent: {agentId}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          agent.hasMetrics ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {agent.hasMetrics ? 'Online' : 'Connected (No Metrics)'}
        </span>
      </div>

      {agentMetrics && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-2 text-gray-700">CPU Power</h3>
              <div className="text-3xl font-bold text-blue-600">{agentMetrics.cpu?.PkgWatt}W</div>
              <div className="text-sm text-gray-500">Temp: {agentMetrics.cpu?.PkgTmp}°C</div>
            </div>

            {agentMetrics.gpu?.available && (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-2 text-gray-700">GPU Usage</h3>
                <div className="text-3xl font-bold text-green-600">{agentMetrics.gpu.utilization}%</div>
                <div className="text-sm text-gray-500">
                  {agentMetrics.gpu.temperature}°C | {agentMetrics.gpu.power_draw}W
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-2 text-gray-700">Memory Usage</h3>
              <div className="text-3xl font-bold text-purple-600">
                {((parseFloat(agentMetrics.memory['K used memory']) / parseFloat(agentMetrics.memory['K total memory'])) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">
                {(parseFloat(agentMetrics.memory['K used memory']) / 1024 / 1024).toFixed(1)}GB /
                {(parseFloat(agentMetrics.memory['K total memory']) / 1024 / 1024).toFixed(1)}GB
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-2 text-gray-700">System Load</h3>
              <div className="text-3xl font-bold text-orange-600">{agentMetrics.cpu?.Avg_MHz}MHz</div>
              <div className="text-sm text-gray-500">Average CPU Frequency</div>
            </div>
          </div>

          {/* Real-time Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CPU & Memory Usage Over Time */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4">System Usage Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    formatter={(value: any, name: string) => [
                      `${parseFloat(value).toFixed(2)}${name.includes('temp') ? '°C' : name.includes('cpu') || name.includes('memory') ? '%' : 'W'}`,
                      name
                    ]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="cpu" stroke="#8884d8" name="CPU Power (W)" />
                  <Line type="monotone" dataKey="memory" stroke="#82ca9d" name="Memory %" />
                  {historicalData[0]?.gpu !== undefined && (
                    <Line type="monotone" dataKey="gpu" stroke="#ffc658" name="GPU %" />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Temperature Chart */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4">Temperature Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    formatter={(value: any, name: string) => [`${parseFloat(value).toFixed(1)}°C`, name]}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="cpuTemp" stackId="1" stroke="#ff7c7c" fill="#ff7c7c" name="CPU Temp" />
                  {historicalData[0]?.gpuTemp !== undefined && (
                    <Area type="monotone" dataKey="gpuTemp" stackId="2" stroke="#ffb347" fill="#ffb347" name="GPU Temp" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Memory Breakdown & Temperature Sensors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Memory Breakdown Pie Chart */}
            {memoryData && (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4">Memory Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={memoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {memoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`${(value / 1024).toFixed(1)} MB`, 'Memory']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Temperature Sensors Bar Chart */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4">Temperature Sensors</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={temperatureData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(value: any) => [`${value}°C`, 'Temperature']} />
                  <Bar dataKey="temp" fill="#ff7c7c" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed System Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CPU Details */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4">CPU Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Frequency:</span>
                  <span className="font-semibold">{agentMetrics.cpu?.Avg_MHz} MHz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Package Temperature:</span>
                  <span className="font-semibold">{agentMetrics.cpu?.PkgTmp}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Package Power:</span>
                  <span className="font-semibold">{agentMetrics.cpu?.PkgWatt}W</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">CPU Ticks (User):</span>
                  <span className="font-semibold">{parseInt(agentMetrics.memory['non-nice user cpu ticks']).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Context Switches:</span>
                  <span className="font-semibold">{parseInt(agentMetrics.memory['CPU context switches']).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Interrupts:</span>
                  <span className="font-semibold">{parseInt(agentMetrics.memory['interrupts']).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Processes:</span>
                  <span className="font-semibold">{parseInt(agentMetrics.memory['forks']).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Memory Details */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4">Memory Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Memory:</span>
                  <span className="font-semibold">{(parseFloat(agentMetrics.memory['K total memory']) / 1024 / 1024).toFixed(1)} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Used Memory:</span>
                  <span className="font-semibold">{(parseFloat(agentMetrics.memory['K used memory']) / 1024 / 1024).toFixed(1)} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Free Memory:</span>
                  <span className="font-semibold">{(parseFloat(agentMetrics.memory['K free memory']) / 1024 / 1024).toFixed(1)} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Buffer Memory:</span>
                  <span className="font-semibold">{(parseFloat(agentMetrics.memory['K buffer memory'] || '0') / 1024 / 1024).toFixed(1)} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Swap Total:</span>
                  <span className="font-semibold">{(parseFloat(agentMetrics.memory['K total swap']) / 1024 / 1024).toFixed(1)} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Swap Used:</span>
                  <span className="font-semibold">{(parseFloat(agentMetrics.memory['K used swap']) / 1024 / 1024).toFixed(1)} GB</span>
                </div>
              </div>
            </div>

            {/* GPU Details (if available) */}
            {agentMetrics.gpu?.available && (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4">GPU Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">GPU Utilization:</span>
                    <span className="font-semibold">{agentMetrics.gpu.utilization}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GPU Temperature:</span>
                    <span className="font-semibold">{agentMetrics.gpu.temperature}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Memory Used:</span>
                    <span className="font-semibold">{agentMetrics.gpu.memory_used} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Power Draw:</span>
                    <span className="font-semibold">{agentMetrics.gpu.power_draw}W</span>
                  </div>
                </div>
              </div>
            )}

            {/* System Control Panel */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4">System Control</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleCommand('reboot')}
                  className="w-full bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
                >
                  Reboot System
                </button>
                <button
                  onClick={() => handleCommand('shutdown')}
                  className="w-full bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                >
                  Shutdown System
                </button>
                <button
                  onClick={() => handleCommand('update-metrics')}
                  className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Update Metrics
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
