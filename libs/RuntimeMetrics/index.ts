import { statfsSync } from "fs"
import { cpus, freemem, hostname, platform, totalmem } from "os"

interface CpuSnapshot {
  atMs: number
  usage: NodeJS.CpuUsage
}

export class RuntimeMetrics {
  private previousCpuSnapshot: CpuSnapshot | null = null

  collect(source: string, packageUid = "unknown-package", connectionIpAddress: string | null = null): iSharedSystem.RuntimeMetricsDto {
    const checkedAt = new Date().toISOString()
    const memory = process.memoryUsage()
    const disk = this.getDiskMetrics(process.cwd())
    const cpu = this.getCpuMetrics()

    return {
      packageUid,
      source,
      packageKind: this.getPackageKind(source),
      connectionIpAddress,
      pid: process.pid,
      hostname: hostname(),
      platform: platform(),
      nodeVersion: process.version,
      uptimeSeconds: Math.round(process.uptime()),
      checkedAt,
      cpu,
      memory: {
        rssBytes: memory.rss,
        heapTotalBytes: memory.heapTotal,
        heapUsedBytes: memory.heapUsed,
        externalBytes: memory.external,
        arrayBuffersBytes: memory.arrayBuffers,
        systemTotalBytes: totalmem(),
        systemFreeBytes: freemem()
      },
      disk
    }
  }

  private getCpuMetrics(): iSharedSystem.RuntimeCpuMetricsDto {
    const now = Date.now()
    const usage = process.cpuUsage()
    const userMs = usage.user / 1000
    const systemMs = usage.system / 1000
    const cores = Math.max(cpus().length, 1)
    const previous = this.previousCpuSnapshot

    this.previousCpuSnapshot = {
      atMs: now,
      usage
    }

    if (!previous) {
      return {
        usagePercent: null,
        userMs,
        systemMs,
        cores
      }
    }

    const elapsedMs = Math.max(now - previous.atMs, 1)
    const userDeltaMs = (usage.user - previous.usage.user) / 1000
    const systemDeltaMs = (usage.system - previous.usage.system) / 1000
    const usagePercent = Math.max(0, Math.min(100, ((userDeltaMs + systemDeltaMs) / elapsedMs / cores) * 100))

    return {
      usagePercent: Number(usagePercent.toFixed(2)),
      userMs,
      systemMs,
      cores
    }
  }

  private getDiskMetrics(path: string): iSharedSystem.RuntimeDiskMetricsDto {
    const stats = statfsSync(path)
    const totalBytes = Number(stats.blocks) * Number(stats.bsize)
    const freeBytes = Number(stats.bavail) * Number(stats.bsize)

    return {
      path,
      totalBytes,
      freeBytes,
      usedBytes: Math.max(totalBytes - freeBytes, 0)
    }
  }

  private getPackageKind(source: string): iSharedSystem.RuntimePackageKind {
    if (source.endsWith("-service")) return "service"
    if (source.endsWith("-gateway")) return "gateway"
    return "unknown"
  }
}

