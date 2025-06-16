#!/usr/bin/env python3

import logging
import websocket
import subprocess
import json
import time
import threading
import socket


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('DeviceAgent')


class CollectMetrics:
    def __init__(self):
        self.collect_data()

    def collect_data(self):
        """Collect system metrics using external tools"""
        # Collect CPU data using turbostat
        try:
            cpu_output = subprocess.check_output(["sudo", "turbostat", "--Summary", "--quiet", "--show", "Avg_MHz,PkgTmp,PkgWatt", "--num_iterations", "1"], text=True)
            self.cpu = self._parse_turbostat(cpu_output)
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            self.cpu = {"error": str(e)}

        # Collect memory data using vmstat
        try:
            mem_output = subprocess.check_output(["vmstat", "-s"], text=True)
            self.mem = self._parse_vmstat(mem_output)
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            self.mem = {"error": str(e)}

        # Collect temperature data using sensors
        try:
            temp_output = subprocess.check_output(["sensors", "-j"], text=True)
            self.temps = json.loads(temp_output)
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            self.temps = {"error": str(e)}

        # GPU data collection would depend on your GPU type (NVIDIA/AMD)
        try:
            gpu_output = subprocess.check_output(["nvidia-smi",
                                                  "--query-gpu=utilization.gpu,temperature.gpu,memory.used,power.draw",
                                                  "--format=csv,noheader,nounits"
                                                  ],
                                                 text=True)
            self.gpu = self._parse_nvidia_smi(gpu_output)
        except (subprocess.CalledProcessError, FileNotFoundError):
            self.gpu = {"available": False}

        return {
            "cpu": self.cpu,
            "memory": self.mem,
            "gpu": self.gpu,
            "temperatures": self.temps
        }

    def collect_data_daemon(self, ws : websocket.WebSocketApp, agentId, interval=3):
        while True:
            if ws and ws.sock and ws.sock.connected:
                self.collect_data()
                metrics = {
                    "type": "metrics",
                    "agentId": agentId,
                    "timestamp": time.time(),
                    "cpu": self.cpu,
                    "gpu": self.gpu,
                    "memory": self.mem,
                    "temps": self.temps
                }
                ws.send(json.dumps(metrics))
            time.sleep(interval)

    def _parse_turbostat(self, output):
        """Parse turbostat output into structured data"""
        lines = output.strip().split('\n')
        if len(lines) < 2:
            return {"error": "Invalid turbostat output"}

        headers = lines[0].split()
        avg_data = lines[-1].split()  # Last line contains averages

        return {headers[i]: avg_data[i] for i in range(min(len(headers), len(avg_data)))}

    def _parse_vmstat(self, output):
        """Parse vmstat output into structured data"""
        result = {}
        for line in output.strip().split('\n'):
            parts = line.strip().split()
            if len(parts) >= 2:
                key = ' '.join(parts[1:])
                value = parts[0]
                result[key] = value
        return result

    def _parse_nvidia_smi(self, output):
        """Parse nvidia-smi output into structured data"""
        if not output.strip():
            return {"available": False}

        values = output.strip().split(',')
        if len(values) >= 3:
            return {
                "utilization": values[0].strip(),
                "temperature": values[1].strip(),
                "memory_used": values[2].strip(),
                "power_draw": values[3].strip(),
                "available": True
            }
        return {"available": False}


# metrics = CollectMetrics()
# print(metrics.cpu, metrics.gpu, metrics.mem, metrics.temps)

class DeviceAgent:
    def __init__(self, server_url, agent_id, recon_delay=5):
        self.server_url = server_url
        self.agent_id = agent_id
        self.metrics = CollectMetrics()
        self.ws = None
        self.recon_delay = recon_delay
        self.running=True
        self.metrics_thread: threading.Thread =None
        logger.info(f"Agent initialized with ID: {agent_id}")

    def connect(self):
        while self.running:
            try:
                self.ws = websocket.WebSocketApp(
                    self.server_url,
                    on_open=self.on_open,
                    on_close=self.on_close,
                    on_message=self.on_message,
                    on_error=self.on_error
                )
                if not self.metrics_thread or not self.metrics_thread.is_alive():
                    self.metrics_thread = threading.Thread(
                        target=self.metrics.collect_data_daemon,
                        args=(self.ws, self.agent_id, 2),
                        daemon=True
                    ).start()

                    logger.info("Started metrics collection thread")
                self.ws.run_forever()

                if self.running:
                    logger.warning(f"Connection lost. Reconnecting in {self.reconnect_delay} seconds...")
                    time.sleep(self.reconnect_delay)
            except Exception as e:
                logger.error(f"Connection error: {str(e)}")
                time.sleep(self.recon_delay)

    def on_open(self, ws: websocket.WebSocketApp):
        logger.info("WebSocket connection established")
        first_com = {
            "type": "register",
            "agentId": self.agent_id
        }
        ws.send(json.dumps(first_com))
        logger.info(f"Sent registration message for agent {self.agent_id}")

    def on_close(self, ws: websocket.WebSocketApp, close_status_code, close_msg):
        logger.info(f"WebSocket connection closed: {close_status_code} - {close_msg}")

    def on_message(self, ws: websocket.WebSocketApp, message):
        logger.debug(f"Received message: {message}")

    def on_error(self, ws: websocket.WebSocketApp, error):
        logger.error(f"Websocket error: {str(error)}")

    def stop(self):
        logger.info("Stopping agent")
        self.running = False
        if self.ws:
            self.ws.close()

def get_hostname():
    """Get a unique identifier for this machine"""
    return socket.gethostname()

if __name__ == "__main__":
    # Create agent with hostname as ID
    agent_id = f"agent-{get_hostname()}"
    server_url = "ws://localhost:3000/ws"

    agent = DeviceAgent(server_url, agent_id)

    try:
        logger.info(f"Starting DeviceAgent {agent_id}")
        agent.connect()
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
        agent.stop()
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        agent.stop()
