import { getConnection } from 'typeorm'
import { connectDatabase, disconnectDatabase } from '../src/db'

test('データベースへ接続', async () => {
  await connectDatabase()
  expect(getConnection().isConnected).toBeTruthy()
})

test('データベース切断', async () => {
  await disconnectDatabase()
  expect(getConnection().isConnected).toBeFalsy()
})
