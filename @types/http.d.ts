declare module "http" {
  interface IncomingMessage {
    user: iContracts.iUserToken
    body: iContracts.iPayload
    scheme?: iContracts.iScheme
    requiredRoles?: iContracts.iRoleId[]
  }
  interface ServerResponse {
    json: ({ error, status, result, headers }: { error: boolean, status: number, result: unknown, headers?: OutgoingHttpHeaders }) => void;
  }
}

export { }
