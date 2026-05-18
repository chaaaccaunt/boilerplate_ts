declare global {
  namespace iSharedSystem {
    type RuntimePackageKind = "service" | "gateway" | "unknown"

    interface RuntimeCpuMetricsDto {
      usagePercent: number | null
      userMs: number
      systemMs: number
      cores: number
    }

    interface RuntimeMemoryMetricsDto {
      rssBytes: number
      heapTotalBytes: number
      heapUsedBytes: number
      externalBytes: number
      arrayBuffersBytes: number
      systemTotalBytes: number
      systemFreeBytes: number
    }

    interface RuntimeDiskMetricsDto {
      path: string
      totalBytes: number
      freeBytes: number
      usedBytes: number
    }

    interface RuntimeMetricsDto {
      source: string
      packageKind: RuntimePackageKind
      pid: number
      hostname: string
      platform: string
      nodeVersion: string
      uptimeSeconds: number
      checkedAt: string
      cpu: RuntimeCpuMetricsDto
      memory: RuntimeMemoryMetricsDto
      disk: RuntimeDiskMetricsDto
    }

    interface RuntimeMetricsUnavailableDto {
      source: string
      status: "unavailable"
      reason: string
      checkedAt: string
    }

    type RuntimeMetricsItemDto =
      | ({ status: "online" } & RuntimeMetricsDto)
      | RuntimeMetricsUnavailableDto

    interface RuntimeMetricsListResponseDto {
      items: RuntimeMetricsItemDto[]
    }
  }
}

export {}

