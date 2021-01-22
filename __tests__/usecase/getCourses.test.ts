import { getConnection } from 'typeorm'
import { connectDatabase, disconnectDatabase } from '../../src/db'
import { Course } from '../../src/model/course'

import { getCoursesUseCase } from '../../src/usecase/getCourses'
import { v4 } from 'uuid'
import { createDBCourse } from '../../src/utils/converter'
import { loadTestData } from '../_loadTestData'
import { compareCourseWithoutId } from '../_comparator'
import { clearDB } from '../_cleardb'
const initialData = loadTestData()

let ids: string[] = []

beforeAll(async () => {
  await connectDatabase()
  await clearDB()
  const repository = getConnection().getRepository(Course)
  ids = (
    await Promise.all(
      initialData.map((d) => repository.save(createDBCourse(d, 2020, v4())))
    )
  ).map((c) => c.id)
})

test('指定した授業データが取得できる', async () => {
  const res = await getCoursesUseCase([ids[0], ids[1]])
  expect(res.length).toBe(2)
  compareCourseWithoutId(
    res[0],
    createDBCourse(initialData.find((c) => c.code === res[0].code)!, 2020, '')
  )
  compareCourseWithoutId(
    res[1],
    createDBCourse(initialData.find((c) => c.code === res[1].code)!, 2020, '')
  )
})

afterAll(() => {
  disconnectDatabase()
})
