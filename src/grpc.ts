import { ServerCredentials, Server } from '@grpc/grpc-js'
import { CourseServiceService } from '../generated/protos/CourseService_grpc_pb'
import { courseService } from './courseService'

let server: Server

export function startServer() {
  return new Promise<void>((resolve, reject) => {
    server = new Server()
    server.addService(CourseServiceService, courseService)
    server.bindAsync(
      '0.0.0.0:50051',
      ServerCredentials.createInsecure(),
      () => {
        server.start()
        resolve()
      }
    )
  })
}

export function stopServer() {
  server.forceShutdown()
}
