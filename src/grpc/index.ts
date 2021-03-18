import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { courseService } from './course.service'
import { logger } from '../logger'
import { CourseService } from '../../generated'
import { ServiceClientConstructor } from '@grpc/grpc-js/build/src/make-client'
import path from 'path'

const protoPath = path.resolve(__dirname, `../../protos/CourseService.proto`)
const serviceName = 'CourseService'

let server: grpc.Server | undefined

const def = protoLoader.loadSync(protoPath, { defaults: true })
const courseServiceDef = (grpc.loadPackageDefinition(def)[
  serviceName
] as ServiceClientConstructor).service

/**
 * grpcサーバー起動
 */
export function startServer() {
  return new Promise<void>((resolve, reject) => {
    if (server) reject(new Error('already started'))
    server = new grpc.Server()
    server!.addService(courseServiceDef, courseService)
    server!.bindAsync(
      '0.0.0.0:50051',
      grpc.ServerCredentials.createInsecure(),
      () => {
        try {
          server!.start()
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
  return new Promise<void>((resolve, reject) => {
    if (!server) throw new Error('not started')
    server.tryShutdown((err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}
