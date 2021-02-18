import { getConnection } from 'typeorm'
import { connectDatabase, disconnectDatabase } from '../../src/database'
import { Course } from '../../src/database/model/course'
import { listAllCoursesUseCase } from '../../src/usecase/listAllCourses'
import { v4 } from 'uuid'
import { createDBCourse } from '../../src/grpc/converter'
import { loadTestData } from '../_loadTestData'
import { compareCourseWithoutId } from '../_comparator'
import { clearDB } from '../_cleardb'
const initialData = loadTestData()

beforeAll(async () => {
  await connectDatabase()
  await clearDB()

  const repository = getConnection().getRepository(Course)
  await Promise.all(
    initialData.map((d) =>
      repository.save(repository.create(createDBCourse(d, 2020, v4())))
    )
  )
})

test('すべてのコースを取得できる', async () => {
  const allCourses = await listAllCoursesUseCase()
  expect(allCourses.length).toBe(initialData.length)
  initialData
    .map((c) => createDBCourse(c, 2020, ''))
    .forEach((c) =>
      compareCourseWithoutId(c, allCourses.find((cc) => cc.code === c.code)!)
    )
})

afterAll(async () => {
  await clearDB()
  disconnectDatabase()
})
