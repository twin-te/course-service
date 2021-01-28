import { getConnection } from 'typeorm'
import { connectDatabase, disconnectDatabase } from '../../src/db'
import { Course } from '../../src/model/course'

import { v4 } from 'uuid'
import { createDBCourse } from '../../src/utils/converter'
import { loadTestData } from '../_loadTestData'
import { compareCourseWithoutId } from '../_comparator'
import { clearDB } from '../_cleardb'
import { getCoursesByCodeUseCase } from '../../src/usecase/getCoursesByCode'
const initialData = loadTestData()

beforeAll(async () => {
  await connectDatabase()
  await clearDB()
  const repository = getConnection().getRepository(Course)
  await Promise.all(
    initialData.map((d) => repository.save(createDBCourse(d, 2020, v4())))
  )
})

test('指定した授業データが取得できる', async () => {
  const res = await getCoursesByCodeUseCase([
    { year: 2020, code: initialData[0].code },
    { year: 2020, code: initialData[1].code },
  ])
  expect(res.length).toBe(2)
  compareCourseWithoutId(res[0], createDBCourse(initialData[0], 2020, ''))
  compareCourseWithoutId(res[1], createDBCourse(initialData[1], 2020, ''))
})

test('存在しないidの情報は帰らない', async () => {
  const res = await getCoursesByCodeUseCase([
    { year: 2020, code: 'FOO' },
    { year: 2021, code: initialData[1].code },
  ])
  expect(res.length).toBe(0)
})

afterAll(() => {
  disconnectDatabase()
})
