'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Gpu } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

export function GpuMetrics({ gpu }) {
  if (!gpu) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Gpu className="h-4 w-4" />
            GPU Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No GPU data available</p>
        </CardContent>
      </Card>
    )
  }

  if (!gpu.available) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Gpu className="h-4 w-4" />
            GPU Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              GPU not available on this system
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const utilizationValue = parseInt(gpu.utilization) || 0
  const temperatureValue = parseInt(gpu.temperature) || 0
  const memoryValue = parseInt(gpu.memory_used) || 0
  const powerValue = parseInt(gpu.power_draw) || 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Gpu className="h-4 w-4 text-green-500" />
          GPU Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Utilization */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Utilization:</span>
              <span className="text-sm font-mono font-medium">{gpu.utilization}%</span>
            </div>
            <Progress value={utilizationValue} className="h-2" />
          </div>

          {/* Temperature */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Temperature:</span>
            <span className="text-sm font-mono font-medium">
              {gpu.temperature}°C
            </span>
          </div>

          {/* Memory */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Memory Used:</span>
            <span className="text-sm font-mono font-medium">
              {gpu.memory_used} MB
            </span>
          </div>

          {/* Power */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Power Draw:</span>
            <span className="text-sm font-mono font-medium">
              {gpu.power_draw} W
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
