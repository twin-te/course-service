import { getRepository } from 'typeorm'
import { v4 } from 'uuid'
import { connectDatabase } from '../../src/database'
import { Course } from '../../src/database/model/course'
import { Day, Module } from '../../src/database/model/enums'
import { InvalidArgumentError } from '../../src/error'
import { createDBCourse } from '../../src/grpc/converter'
import { searchCourseUseCase, SearchMode } from '../../src/usecase/searchCourse'
import { clearDB } from '../_cleardb'
import { loadTestData } from '../_loadTestData'

/* ----------------テスト用ユーティリティ関数---------------- */

/**
 * コースが指定された時限内に収まっているかチェック
 * @param course チェックするコース
 * @param conditions 条件
 */
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

/**
 * コースが指定された時限中に開講されているかチェック
 * @param course チェックするコース
 * @param conditions 条件
 */
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

/**
 * 全モジュールを指定された値で埋めるユーティリティ
 * @param c 埋める値
 * @returns 結果
 */
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

/**
 * 全曜日をしてされた値で埋めるユーティリティ
 * @param c 埋める値
 * @returns 結果
 */
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

/* ----------------テストここから---------------- */

const initialData = loadTestData()

beforeAll(async () => {
  await connectDatabase()
  await clearDB()
  await getRepository(Course).save(
    initialData.map((c) => createDBCourse(c, 2020, v4()))
  )
})

test('キーワード検索単体(科目番号指定なし)', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: ['情報'],
    codes: [],
    searchMode: SearchMode.Cover,
    offset: 0,
    limit: 30,
  })
  expect(res.length > 0).toBe(true)
  expect(res.length <= 30).toBe(true)
  res.forEach((c) => expect(c.name.includes('情報')).toBe(true))
})

test('キーワード複数(科目番号指定なし)', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: ['情報', '人工知能'],
    codes: [],
    searchMode: SearchMode.Cover,
    offset: 0,
    limit: 30,
  })
  expect(res.length > 0).toBe(true)
  expect(res.length <= 30).toBe(true)
  res.forEach((c) =>
    expect(c.name.includes('情報') && c.name.includes('人工知能')).toBe(true)
  )
})

test('科目番号指定(キーワード指定なし)', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    codes: ['FF'],
    searchMode: SearchMode.Cover,
    offset: 0,
    limit: 30,
  })
  expect(res.length > 0).toBe(true)
  expect(res.length <= 30).toBe(true)
  res.forEach((c) => expect(c.code.startsWith('FF')).toBe(true))
})

test('科目番号指定複数(キーワード指定なし)', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    codes: ['FF', 'GB'],
    searchMode: SearchMode.Cover,
    offset: 0,
    limit: 30,
  })
  expect(res.length > 0).toBe(true)
  expect(res.length <= 30).toBe(true)
  res.forEach((c) =>
    expect(c.code.startsWith('FF') || c.code.startsWith('GB')).toBe(true)
  )
})

test('キーワード指定&科目番号指定', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: ['科学'],
    codes: ['FF'],
    searchMode: SearchMode.Cover,
    offset: 0,
    limit: 30,
  })
  expect(res.length > 0).toBe(true)
  expect(res.length <= 30).toBe(true)
  res.forEach((c) =>
    expect(c.name.includes('科学') && c.code.startsWith('FF')).toBe(true)
  )
})

test('キーワードなしで全部', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    codes: [],
    searchMode: SearchMode.Cover,
    offset: 0,
    limit: initialData.length,
  })
  expect(res.length > 0).toBe(true)
  expect(res.length).toBe(initialData.length)
})

test('不正なoffset', () => {
  return expect(
    searchCourseUseCase({
      year: 2020,
      keywords: ['情報'],
      codes: [],
      searchMode: SearchMode.Cover,
      offset: -1,
      limit: 30,
    })
  ).rejects.toThrow(InvalidArgumentError)
})

test('不正なlimit', () => {
  return expect(
    searchCourseUseCase({
      year: 2020,
      keywords: ['情報'],
      codes: [],
      searchMode: SearchMode.Cover,
      offset: 0,
      limit: 0,
    })
  ).rejects.toThrow(InvalidArgumentError)
})

test('キーワード指定&科目番号指定&時間割', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: ['科学'],
    codes: ['FF'],
    timetable: {
      FallA: {
        Thu: [false, true, false, false, false, false, false, false, false],
      },
      FallB: {
        Thu: [false, true, false, false, false, false, false, false, false],
      },
      FallC: {
        Thu: [false, true, false, false, false, false, false, false, false],
      },
    },
    searchMode: SearchMode.Contain,
    offset: 0,
    limit: 30,
  })
  expect(res.length > 0).toBe(true)
  expect(res.length <= 30).toBe(true)
  res.forEach((c) =>
    expect(c.name.includes('科学') && c.code.startsWith('FF')).toBe(true)
  )
})

test('時間割 contain1', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    codes: [],
    searchMode: SearchMode.Contain,
    timetable: {
      SpringA: {
        Tue: [false, true, true, false, false, false, false, false, false],
      },
      SpringB: {
        Tue: [false, true, true, false, false, false, false, false, false],
      },
    },
    offset: 0,
    limit: 30,
  })
  expect(res.length > 0).toBe(true)
  expect(res.length <= 30).toBe(true)
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
    codes: [],
    searchMode: SearchMode.Contain,
    timetable: {
      SpringA: {
        Tue: [false, false, true, false, false, false, false, false, false],
      },
      SpringB: {
        Tue: [false, false, true, false, false, false, false, false, false],
      },
    },
    offset: 0,
    limit: 30,
  })
  expect(res.length > 0).toBe(true)
  expect(res.length <= 30).toBe(true)
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
    codes: [],
    searchMode: SearchMode.Contain,
    timetable: {
      SpringA: fillAllDayWith(new Array(7).fill(true)),
      SpringB: fillAllDayWith(new Array(7).fill(true)),
    },
    offset: 0,
    limit: 30,
  })
  expect(res.length > 0).toBe(true)
  expect(res.length <= 30).toBe(true)
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
    codes: [],
    searchMode: SearchMode.Contain,
    timetable: fillAllModuleWith({
      Intensive: [true, false, false, false, false, false, false],
    }),
    offset: 0,
    limit: 30,
  })
  expect(res.length > 0).toBe(true)
  expect(res.length <= 30).toBe(true)
  res.forEach((c) =>
    checkScheduleContain(c, [{ day: Day.Intensive, periods: [0] }])
  )
})

test('時間割 cover1', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    codes: [],
    searchMode: SearchMode.Cover,
    timetable: {
      SpringA: {
        Wed: [false, false, false, false, false, true, true],
      },
    },
    offset: 0,
    limit: 30,
  })
  expect(res.length > 0).toBe(true)
  expect(res.length <= 30).toBe(true)
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
    codes: [],
    searchMode: SearchMode.Cover,
    timetable: {
      SpringA: {
        Wed: [false, false, false, false, false, false, true],
      },
    },
    offset: 0,
    limit: 30,
  })
  expect(res.length > 0).toBe(true)
  expect(res.length <= 30).toBe(true)
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
    codes: [],
    searchMode: SearchMode.Cover,
    timetable: {
      SpringA: fillAllDayWith(new Array(7).fill(true)),
    },
    offset: 0,
    limit: 30,
  })
  expect(res.length > 0).toBe(true)
  expect(res.length <= 30).toBe(true)
  res.forEach((c) => checkScheduleCover(c, [{ module: Module.SpringA }]))
})

test('時間割 cover4', async () => {
  const res = await searchCourseUseCase({
    year: 2020,
    keywords: [],
    codes: [],
    searchMode: SearchMode.Cover,
    timetable: fillAllModuleWith({
      Intensive: new Array(8).fill(true),
    }),
    offset: 0,
    limit: 30,
  })
  expect(res.length > 0).toBe(true)
  expect(res.length <= 30).toBe(true)
  res.forEach((c) => checkScheduleCover(c, [{ day: Day.Intensive }]))
})
