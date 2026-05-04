import type { Server as HttpNativeServer } from "http"
import type { Socket } from "socket.io"

export interface iWebSocketConfig {
  origin: string
  cookie_name: string
  jwt_secret: string
  jwt_issuer?: string
  jwt_audience?: string
}

export interface iWebSocketConnectionContext {
  socket: Socket
  user: iContracts.iUserToken
}

export interface iWebSocketEventContext extends iWebSocketConnectionContext {
  eventName: string
}

export interface iWebSocketEventResult<TResult = unknown> {
  eventName: string
  result: TResult
}

export interface iWebSocketEventHandler<TPayload = iContracts.iPayload, TResult = unknown> {
  (context: iWebSocketEventContext, payload: TPayload): Promise<TResult> | TResult
}

export interface iWebSocketEvent<TPayload = iContracts.iPayload, TResult = unknown> {
  name: string
  validator?: iContracts.iScheme
  handler: iWebSocketEventHandler<TPayload, TResult>
}

export interface iWebSocketGateway {
  readonly name: string
  getEvents(): readonly iWebSocketEvent[]
}

export type iWebSocketNativeServer = HttpNativeServer
