import type { ApiClient } from "@/application/api/ApiClient"

export class SystemApi {
  constructor(private readonly api: ApiClient) {}

  metrics(): Promise<iSharedSystem.RuntimeMetricsListResponseDto> {
    return this.api.get<iSharedSystem.RuntimeMetricsListResponseDto>({
      path: "/system/metrics",
      commit: "system/setMetrics"
    })
  }

  metric(packageUid: string): Promise<iSharedSystem.RuntimeMetricsItemResponseDto> {
    return this.api.get<iSharedSystem.RuntimeMetricsItemResponseDto>({
      path: `/system/metrics/item?packageUid=${encodeURIComponent(packageUid)}`,
      commit: "system/setMetric"
    })
  }
}

