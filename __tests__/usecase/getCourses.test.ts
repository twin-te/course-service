import { getConnection } from 'typeorm'
import { connectDatabase, disconnectDatabase } from '../../src/database/'
import { Course } from '../../src/database/model/course'

import { getCoursesUseCase } from '../../src/usecase/getCourses'
import { v4 } from 'uuid'
import { createDBCourse } from '../../src/grpc/converter'
import { loadTestData } from '../_loadTestData'
import { compareCourseWithoutId } from '../_comparator'
import { clearDB } from '../_cleardb'
import { InvalidArgumentError, NotFoundError } from '../../src/error'
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

test('id重複でエラー', () =>
  expect(getCoursesUseCase([ids[0], ids[0]])).rejects.toThrow(
    InvalidArgumentError
  ))
test('一部の取得に失敗してもエラー', () => {
  return expect(getCoursesUseCase([ids[0], v4()])).rejects.toThrow(
    NotFoundError
  )
})

test('存在しないidの情報は帰らない', () => {
  return expect(getCoursesUseCase([v4(), v4()])).rejects.toThrow(NotFoundError)
})

afterAll(() => {
  disconnectDatabase()
})
