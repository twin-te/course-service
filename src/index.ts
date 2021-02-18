import { connectDatabase } from './database'
import { startServer } from './grpc'
import { logger } from './logger'

/**
 * エントリポイント
 */
const main = async () => {
  logger.info('service is starting.')
  await connectDatabase()
  await startServer()
  logger.info('ready.')
}

process.on('uncaughtException', (err) => {
  logger.fatal('uncaughtException\n', err)
})

process.on('unhandledRejection', (reason, p) => {
  logger.fatal('unhandledRejection\n', p, reason)
})

main()
