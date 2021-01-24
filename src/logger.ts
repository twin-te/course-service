import log4js from 'log4js'

log4js.configure({
  appenders: { std: { type: 'stdout' } },
  categories: { default: { appenders: ['std'], level: 'trace' } },
})

export const logger = log4js.getLogger()
export const grpcLogger = log4js.getLogger('grpc')
