declare module "http" {
  interface IncomingMessage {
    user: iContracts.iUserToken
    body: iContracts.iPayload
    scheme?: iContracts.iScheme
  }
  interface ServerResponse {
    json: ({ error, status, result, headers }: { error: boolean, status: number, result: unknown, headers?: OutgoingHttpHeaders }) => void;
  }
}

export { }
