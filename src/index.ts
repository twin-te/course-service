import { connectDatabase } from './db'
import { startServer } from './grpc'

/**
 * エントリポイント
 */
const main = async () => {
  await connectDatabase()
  console.log('pg connected')
  await startServer()
  console.log('grpc server start')
}

main()

export default main
