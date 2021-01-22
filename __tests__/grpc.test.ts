import { credentials } from '@grpc/grpc-js'
import { ConnectivityState } from '@grpc/grpc-js/build/src/channel'
import { CourseServiceClient } from '../generated/protos/CourseService_grpc_pb'
import { startServer, stopServer } from '../src/grpc'

test('grpcサーバーが立ち上がるか', async (done) => {
  await startServer()
  const client = new CourseServiceClient(
    'localhost:50051',
    credentials.createInsecure()
  )
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
  const client = new CourseServiceClient(
    'localhost:50051',
    credentials.createInsecure()
  )
  client.waitForReady(Date.now() + 3000, (err) => {
    expect(err).not.toBeUndefined()
    client.close()
    done()
  })
})
