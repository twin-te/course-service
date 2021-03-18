import * as grpc from '@grpc/grpc-js'
import { ConnectivityState } from '@grpc/grpc-js/build/src/channel'
import path from 'path'
import { CourseService } from '../../generated'
import { startServer, stopServer } from '../../src/grpc'
import { GrpcClient } from '../../src/grpc/type'
import * as protoLoader from '@grpc/proto-loader'
import { ServiceClientConstructor } from '@grpc/grpc-js/build/src/make-client'

const def = protoLoader.loadSync(
  path.resolve(__dirname, `../../protos/CourseService.proto`)
)
const pkg = grpc.loadPackageDefinition(def)
const ClientConstructor = pkg.CourseService as ServiceClientConstructor

test('grpcサーバーが立ち上がるか', async (done) => {
  await startServer()

  const client = (new ClientConstructor(
    'localhost:50051',
    grpc.ChannelCredentials.createInsecure()
  ) as unknown) as GrpcClient<CourseService>

  client.waitForReady(Date.now() + 3000, (err) => {
    expect(err).toBeUndefined()
    expect(client.getChannel().getConnectivityState(true)).toBe(
      ConnectivityState.READY
    )
    client.close()
    done()
  })
})

test('grpcサーバーが閉じるかどうか', async (done) => {
  stopServer()
  const client = (new ClientConstructor(
    'localhost:50051',
    grpc.ChannelCredentials.createInsecure()
  ) as unknown) as GrpcClient<CourseService>
  client.waitForReady(Date.now() + 3000, (err) => {
    expect(err).not.toBeUndefined()
    client.close()
    done()
  })
})
