import dotenv from 'dotenv'
import { connectDatabase } from './db'
import { startServer } from './grpc'
import { fetchCoursesFromKdbUseCase } from './usecase/fetchCoursesFromKdb'
import { updateCourseDatabaseUseCase } from './usecase/updateCourseDatabase'
import { listAllCoursesUseCase } from './usecase/listAllCourses'
import { getCoursesUseCase } from './usecase/getCourses'

dotenv.config()

const main = async () => {
  await connectDatabase()
  console.log('pg connected')
  await startServer({
    fetchCoursesFromKdbUseCase,
    updateCourseDatabaseUseCase,
    listAllCoursesUseCase,
    getCoursesUseCase,
  })
  console.log('grpc server start')
}

main()

export default main
