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
  const res = course.schedules.every((s) =>
    conditions.some(
      (c) =>
        (typeof c.module === 'undefined' || s.module === c.module) &&
        (typeof c.day === 'undefined' || s.day === c.day) &&
        (typeof c.periods === 'undefined' || c.periods.includes(s.period))
    )
  )
  if (!res) console.error('失敗', course)
  expect(res).toBe(true)
}

function checkScheduleCover(
  course: Course,
  conditions: { module?: Module; day?: Day; periods?: number[] }[]
) {
  const res = course.schedules.some((s) =>
    conditions.some(
      (c) =>
        (typeof c.module === 'undefined' || s.module === c.module) &&
        (typeof c.day === 'undefined' || s.day === c.day) &&
        (typeof c.periods === 'undefined' || c.periods.includes(s.period))
    )
  )
  if (!res) console.error('失敗', course)
  expect(res).toBe(true)
}

function fillAllModuleWith(c: any) {
  return {
    SpringA: c,
    SpringB: c,
    SpringC: c,
    FallA: c,
    FallB: c,
    FallC: c,
    SummerVacation: c,
    SpringVacation: c,
  }
}

function fillAllDayWith(c: boolean[]) {
  return {
    Sun: c,
    Mon: c,
    Tue: c,
    Wed: c,
    Thu: c,
    Fri: c,
    Sta: c,
  }
}

test('キーワード検索単体', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: ['情報'],
    searchMode: SearchMode.Cover,
  })
  expect(res.length > 0).toBe(true)
  res.forEach((c) => expect(c.name.includes('情報')).toBe(true))
})

test('キーワード複数', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: ['情報', 'スポーツ'],
    searchMode: SearchMode.Cover,
  })
  expect(res.length > 0).toBe(true)
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
  expect(res.length > 0).toBe(true)
  expect(res.length).toBe(initialData.length)
})

test('時間割 contain1', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    searchMode: SearchMode.Contain,
    timetable: {
      SpringA: {
        Tue: [false, true, true, false, false, false, false, false, false],
      },
      SpringB: {
        Tue: [false, true, true, false, false, false, false, false, false],
      },
    },
  })
  expect(res.length > 0).toBe(true)
  res.forEach((c) =>
    checkScheduleContain(c, [
      { module: Module.SpringA, day: Day.Tue, periods: [1, 2] },
      { module: Module.SpringB, day: Day.Tue, periods: [1, 2] },
    ])
  )
})

test('時間割 contain2', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    searchMode: SearchMode.Contain,
    timetable: {
      SpringA: {
        Tue: [false, false, true, false, false, false, false, false, false],
      },
      SpringB: {
        Tue: [false, false, true, false, false, false, false, false, false],
      },
    },
  })
  expect(res.length > 0).toBe(true)
  res.forEach((c) =>
    checkScheduleContain(c, [
      { module: Module.SpringA, day: Day.Tue, periods: [2] },
      { module: Module.SpringB, day: Day.Tue, periods: [2] },
    ])
  )
})

test('時間割 contain3', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    searchMode: SearchMode.Contain,
    timetable: {
      SpringA: fillAllDayWith(new Array(7).fill(true)),
      SpringB: fillAllDayWith(new Array(7).fill(true)),
    },
  })
  expect(res.length > 0).toBe(true)
  res.forEach((c) =>
    checkScheduleContain(c, [
      { module: Module.SpringA },
      { module: Module.SpringB },
    ])
  )
})

test('時間割 contain4', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    searchMode: SearchMode.Contain,
    timetable: fillAllModuleWith({
      Intensive: [true, false, false, false, false, false, false],
    }),
  })
  expect(res.length > 0).toBe(true)
  res.forEach((c) =>
    checkScheduleContain(c, [{ day: Day.Intensive, periods: [0] }])
  )
})

test('時間割 cover1', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    searchMode: SearchMode.Cover,
    timetable: {
      SpringA: {
        Wed: [false, false, false, false, false, true, true],
      },
    },
  })
  expect(res.length > 0).toBe(true)
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
    searchMode: SearchMode.Cover,
    timetable: {
      SpringA: {
        Wed: [false, false, false, false, false, false, true],
      },
    },
  })
  expect(res.length > 0).toBe(true)
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
    searchMode: SearchMode.Cover,
    timetable: {
      SpringA: fillAllDayWith(new Array(7).fill(true)),
    },
  })
  expect(res.length > 0).toBe(true)
  res.forEach((c) => checkScheduleCover(c, [{ module: Module.SpringA }]))
})

test('時間割 cover4', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    searchMode: SearchMode.Cover,
    timetable: fillAllModuleWith({
      Intensive: new Array(8).fill(true),
    }),
  })
  expect(res.length > 0).toBe(true)
  res.forEach((c) => checkScheduleCover(c, [{ day: Day.Intensive }]))
})
