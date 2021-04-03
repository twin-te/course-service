import { getConnection, Repository } from 'typeorm'
import { connectDatabase, disconnectDatabase } from '../../src/database'
import { Course } from '../../src/database/model/course'
import { Module as PModule, Day as PDay } from 'twinte-parser'
import { updateCourseDatabaseUseCase } from '../../src/usecase/updateCourseDatabase'
import { loadTestData } from '../_loadTestData'
import { clearDB } from '../_cleardb'
import { createDBCourse } from '../../src/grpc/converter'
import { compareCourseWithoutId } from '../_comparator'

const initialData = loadTestData()
let courseRepo: Repository<Course>

beforeAll(async () => {
  await connectDatabase()
  await clearDB()
  courseRepo = getConnection().getRepository(Course)
})

test('初回更新', async () => {
  const res = await updateCourseDatabaseUseCase(2020, initialData)
  expect(res.updatedCourses.length).toBe(0)
  expect(res.insertedCourses.length).toBe(initialData.length)
  initialData.forEach((d) =>
    expect(res.insertedCourses.find((i) => i.code === d.code)).toBeTruthy()
  )
  await Promise.all(
    initialData
      .map((c) => createDBCourse(c, 2020, ''))
      .map(async (c) => {
        const d = await courseRepo.findOne(
          { year: 2020, code: c.code },
          { relations: ['recommendedGrades', 'methods', 'schedules'] }
        )
        compareCourseWithoutId(d!, c)
      })
  )
})

test('一部更新', async () => {
  const updatedData = [...initialData]
  updatedData[1].schedules = [
    { module: PModule.FallA, day: PDay.Wed, period: 3, room: '3A206' },
    { module: PModule.FallB, day: PDay.Thu, period: 4, room: '3A207' },
  ]
  updatedData[1].lastUpdate = new Date(
    updatedData[1].lastUpdate.getTime() + 1000
  )
  const res = await updateCourseDatabaseUseCase(2020, updatedData)
  expect(res.updatedCourses.length).toBe(1)
  expect(res.insertedCourses.length).toBe(0)
  const i = createDBCourse(updatedData[1], 2020, '')
  const d = await courseRepo.findOne(res.updatedCourses[0].id, {
    relations: ['recommendedGrades', 'methods', 'schedules'],
  })
  compareCourseWithoutId(i, d!)
})

test('強制更新', async () => {
  const res = await updateCourseDatabaseUseCase(2020, initialData, true)
  expect(res.updatedCourses.length).toBe(initialData.length)
  expect(res.insertedCourses.length).toBe(0)
  initialData.forEach((d) =>
    expect(res.updatedCourses.find((i) => i.code === d.code)).toBeTruthy()
  )
  await Promise.all(
    initialData
      .map((c) => createDBCourse(c, 2020, ''))
      .map(async (c) => {
        const d = await courseRepo.findOne(
          { year: 2020, code: c.code },
          { relations: ['recommendedGrades', 'methods', 'schedules'] }
        )
        compareCourseWithoutId(d!, c)
      })
  )
}, 10000)

test('不正データ', async () => {
  const brokenData = [...initialData]
  brokenData[0].code = 'GB00002'
  // @ts-ignore 無理に不正データを作成するため
  brokenData[0].name = undefined
  await expect(
    updateCourseDatabaseUseCase(2020, brokenData)
  ).rejects.toBeTruthy()
})

afterAll(async () => {
  await clearDB()
  disconnectDatabase()
})
