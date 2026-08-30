import type { Socket } from "net"
import type { iLogCollectorConnectionState, iLogCollectorOfflinePackageState } from "./types"

export class LogCollectorConnectionRegistry {
  private readonly connectionStates = new Set<iLogCollectorConnectionState>()
  private readonly offlinePackageStates = new Map<string, iLogCollectorOfflinePackageState>()

  create(socket: Socket, connectionId: string): iLogCollectorConnectionState {
    const state: iLogCollectorConnectionState = {
      connectionId,
      authenticated: false,
      packageUid: null,
      source: null,
      socket
    }

    this.connectionStates.add(state)
    return state
  }

  delete(state: iLogCollectorConnectionState): void {
    this.connectionStates.delete(state)
  }

  markAuthenticated(state: iLogCollectorConnectionState, runtimePackage: { uid: string; name: string }): void {
    state.authenticated = true
    state.packageUid = runtimePackage.uid
    state.source = runtimePackage.name
    this.offlinePackageStates.delete(runtimePackage.uid)
  }

  rememberOffline(state: iLogCollectorConnectionState, disconnectedAt: string): void {
    if (!state.packageUid || !state.source) return

    this.offlinePackageStates.set(state.packageUid, {
      packageUid: state.packageUid,
      source: state.source,
      connectionIpAddress: state.socket.remoteAddress || null,
      disconnectedAt,
      reason: "Package отключился от log collector"
    })
  }

  getWritableAuthenticatedStates(): iLogCollectorConnectionState[] {
    return Array.from(this.connectionStates)
      .filter((state) => state.source && state.socket.writable)
  }

  getWritablePackageStates(): iLogCollectorConnectionState[] {
    const packageStates = new Map<string, iLogCollectorConnectionState>()

    this.getWritableAuthenticatedStates().forEach((state) => {
      if (state.packageUid && !packageStates.has(state.packageUid)) {
        packageStates.set(state.packageUid, state)
      }
    })

    return Array.from(packageStates.values())
  }

  getOnlinePackageUids(): Set<string> {
    return new Set(this.getWritableAuthenticatedStates()
      .map((state) => state.packageUid)
      .filter((value): value is string => Boolean(value)))
  }

  findByPackageUid(packageUid: string): iLogCollectorConnectionState | undefined {
    return Array.from(this.connectionStates)
      .find((state) => state.packageUid === packageUid)
  }

  findWritableByPackageUid(packageUid: string): iLogCollectorConnectionState | undefined {
    return Array.from(this.connectionStates)
      .find((state) => state.packageUid === packageUid && state.source && state.socket.writable)
  }

  hasWritablePackageConnection(packageUid: string): boolean {
    return Boolean(this.findWritableByPackageUid(packageUid))
  }

  getOfflinePackageState(packageUid: string): iLogCollectorOfflinePackageState | undefined {
    return this.offlinePackageStates.get(packageUid)
  }

  getOfflinePackageStatesExcluding(packageUids: Set<string>): iLogCollectorOfflinePackageState[] {
    return Array.from(this.offlinePackageStates.values())
      .filter((state) => !packageUids.has(state.packageUid))
  }
}
