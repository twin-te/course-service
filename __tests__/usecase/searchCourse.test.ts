import { getRepository } from 'typeorm'
import { v4 } from 'uuid'
import { connectDatabase } from '../../src/database'
import { Course } from '../../src/database/model/course'
import { Day, Module } from '../../src/database/model/enums'
import { createDBCourse } from '../../src/grpc/converter'
import { searchCourseUseCase, SearchMode } from '../../src/usecase/searchCourse'
import { clearDB } from '../_cleardb'
import { loadTestData } from '../_loadTestData'

const initialData = loadTestData()

beforeAll(async () => {
  await connectDatabase()
  await clearDB()
  await getRepository(Course).save(
    initialData.map((c) => createDBCourse(c, 2020, v4()))
  )
})

function checkScheduleContain(
  course: Course,
  conditions: { module?: Module; day?: Day; periods?: number[] }[]
) {
  expect(
    course.schedules.every((s) =>
      conditions.some(
        (c) =>
          (!s.module || s.module === c.module) &&
          (!s.day || s.day === c.day) &&
          (!c.periods || c.periods?.find((p) => s.period))
      )
    )
  ).toBe(true)
}

function checkScheduleCover(
  course: Course,
  conditions: { module?: Module; day?: Day; periods?: number[] }[]
) {
  expect(
    course.schedules.some((s) =>
      conditions.some(
        (c) =>
          (!s.module || s.module === c.module) &&
          (!s.day || s.day === c.day) &&
          (!c.periods || c.periods?.find((p) => s.period))
      )
    )
  ).toBe(true)
}

test('キーワード検索単体', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: ['情報'],
    searchMode: SearchMode.Cover,
  })
  console.log(res.length)
  res.forEach((c) => expect(c.name.includes('情報')).toBe(true))
})

test('キーワード複数', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: ['情報', 'スポーツ'],
    searchMode: SearchMode.Cover,
  })
  res.forEach((c) =>
    expect(c.name.includes('情報') || c.name.includes('スポーツ')).toBe(true)
  )
})

test('キーワードなしで全部', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    searchMode: SearchMode.Cover,
  })
  expect(res.length).toBe(initialData.length)
})

test('時間割 contain1', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    searchMode: SearchMode.Contain,
    timetable: {
      [Module.SpringA]: {
        [Day.Wed]: [false, false, false, false, false, true, true],
      },
    },
  })
  res.forEach((c) =>
    checkScheduleContain(c, [
      { module: Module.SpringA, day: Day.Wed, periods: [5, 6] },
    ])
  )
})

test('時間割 contain2', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    searchMode: SearchMode.Contain,
    timetable: {
      [Module.SpringA]: {
        [Day.Wed]: [false, false, false, false, false, false, true],
      },
    },
  })
  res.forEach((c) =>
    checkScheduleContain(c, [
      { module: Module.SpringA, day: Day.Wed, periods: [5] },
    ])
  )
})

test('時間割 contain3', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    searchMode: SearchMode.Contain,
    timetable: {
      [Module.SpringA]: new Array(8).fill(new Array(7).fill(true)),
    },
  })
  res.forEach((c) => checkScheduleContain(c, [{ module: Module.SpringA }]))
})

test('時間割 contain4', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    searchMode: SearchMode.Contain,
    timetable: new Array(8).fill({
      [Day.Intensive]: [true, false, false, false, false, false, false],
    }),
  })
  res.forEach((c) =>
    checkScheduleContain(c, [{ day: Day.Intensive, periods: [0] }])
  )
})

test('時間割 cover1', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    searchMode: SearchMode.Contain,
    timetable: {
      [Module.SpringA]: {
        [Day.Wed]: [false, false, false, false, false, true, true],
      },
    },
  })
  res.forEach((c) =>
    checkScheduleCover(c, [
      { module: Module.SpringA, day: Day.Wed, periods: [5, 6] },
    ])
  )
})

test('時間割 cover2', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    searchMode: SearchMode.Contain,
    timetable: {
      [Module.SpringA]: {
        [Day.Wed]: [false, false, false, false, false, false, true],
      },
    },
  })
  res.forEach((c) =>
    checkScheduleCover(c, [
      { module: Module.SpringA, day: Day.Wed, periods: [6] },
    ])
  )
})

test('時間割 cover3', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    searchMode: SearchMode.Contain,
    timetable: {
      [Module.SpringA]: new Array(8).fill(new Array(7).fill(true)),
    },
  })
  res.forEach((c) => checkScheduleCover(c, [{ module: Module.SpringA }]))
})

test('時間割 contain4', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    searchMode: SearchMode.Contain,
    timetable: new Array(8).fill({
      [Day.Intensive]: new Array(8).fill(true),
    }),
  })
  res.forEach((c) => checkScheduleCover(c, [{ day: Day.Intensive }]))
})
