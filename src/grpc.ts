import { ServerCredentials, Server } from '@grpc/grpc-js'
import { CourseServiceService } from '../generated/protos/CourseService_grpc_pb'
import { courseService } from './courseService'
import { logger } from './logger'

let server: Server

/**
 * grpcサーバー起動
 */
export function startServer() {
  return new Promise<void>((resolve, reject) => {
    server = new Server()
    server.addService(CourseServiceService, courseService)
    server.bindAsync(
      '0.0.0.0:50051',
      ServerCredentials.createInsecure(),
      () => {
        try {
          server.start()
          logger.info('grpc server started.')
          resolve()
        } catch (e) {
          logger.fatal('cannot start grpc server.', e)
          process.exit(1)
        }
      }
    )
  })
}

/**
 * grpcサーバー停止
 */
export function stopServer() {
  server.forceShutdown()
}
