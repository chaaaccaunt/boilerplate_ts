import {
  AppConfiguration,
  Exceptions,
  HTTPServer,
  Logger,
  MethodTracer,
  PayloadValidator,
  TraceContext,
  WebSocketServer
} from "@/libs"
import type {
  iAppConfig as LibAppConfig,
  iHTTPConfig as LibHTTPConfig,
  iHTTPServerEnv as LibHTTPServerEnv,
  iLibsEnv as LibLibsEnv,
  iLoggerEnv as LibLoggerEnv,
  iWebSocketConfig as LibWebSocketConfig,
  iWebSocketEvent as LibWebSocketEvent,
  iWebSocketEventContext as LibWebSocketEventContext,
  iWebSocketEventHandler as LibWebSocketEventHandler,
  iWebSocketEventResult as LibWebSocketEventResult,
  iWebSocketGateway as LibWebSocketGateway,
  iWebSocketNativeServer as LibWebSocketNativeServer,
  LogLevel as LibLogLevel,
  TraceLayer as LibTraceLayer
} from "@/libs"

declare global {
  namespace iLibs {
    type AppConfiguration = InstanceType<typeof AppConfiguration>
    type AppConfigurationClass = typeof AppConfiguration
    type Exceptions = typeof Exceptions
    type HTTPServer = InstanceType<typeof HTTPServer>
    type HTTPServerClass = typeof HTTPServer
    type WebSocketServer = InstanceType<typeof WebSocketServer>
    type WebSocketServerClass = typeof WebSocketServer
    type Logger = InstanceType<typeof Logger>
    type LoggerClass = typeof Logger
    type MethodTracer = InstanceType<typeof MethodTracer>
    type MethodTracerClass = typeof MethodTracer
    type PayloadValidator = typeof PayloadValidator
    type TraceContext = InstanceType<typeof TraceContext>
    type TraceContextClass = typeof TraceContext

    type iAppConfig = LibAppConfig
    type iHTTPConfig = LibHTTPConfig
    type iHTTPServerEnv = LibHTTPServerEnv
    type iLibsEnv = LibLibsEnv
    type iLoggerEnv = LibLoggerEnv
    type iWebSocketConfig = LibWebSocketConfig
    type iWebSocketEvent = LibWebSocketEvent
    type iWebSocketEventContext = LibWebSocketEventContext
    type iWebSocketEventHandler = LibWebSocketEventHandler
    type iWebSocketEventResult = LibWebSocketEventResult
    type iWebSocketGateway = LibWebSocketGateway
    type iWebSocketNativeServer = LibWebSocketNativeServer
    type LogLevel = LibLogLevel
    type TraceLayer = LibTraceLayer
  }
}

export { }
