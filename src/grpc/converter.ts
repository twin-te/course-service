import {
  Module as PModule,
  Day as PDay,
  Course as PCourse,
} from 'twinte-parser'
import { Course } from '../database/model/course'
import { CourseMethod } from '../database/model/courseMethod'
import { CourseRecommendedGrade } from '../database/model/courseRecommendedGrade'
import { CourseSchedule } from '../database/model/courseSchedule'
import {
  Module,
  Day,
  CourseMethod as CourseMethodEnum,
} from '../database/model/enums'

/**
 * パーサのModule enumをデータベースのenumへ変換
 * @param m パーサのModule
 */
export function createDBModule(m: PModule): Module {
  return Module[
    Module[Object.values(PModule).indexOf(m)] as keyof typeof Module
  ]
}

/**
 * パーサのDay enumをデータベースのenum変換
 * @param d パーサのDay
 */
export function createDBDay(d: PDay): Day {
  return Day[Day[Object.values(PDay).indexOf(d)] as keyof typeof Day]
}

/**
 * kdb備考欄から開講形式を取得する
 * @param remarks 備考欄の文字列
 */
export function parseCourseMethod(remarks: string): CourseMethodEnum[] {
  const res: CourseMethodEnum[] = []
  if (remarks.includes('対面')) res.push(CourseMethodEnum.FaceToFace)
  if (remarks.includes('オンデマンド'))
    res.push(CourseMethodEnum.OnlineAsynchronous)
  if (remarks.includes('双方向')) res.push(CourseMethodEnum.OnlineSynchronous)
  return res
}

/**
 * パーサの結果からデータベースEntityを生成する
 * @param c パーサから出力されたコース
 * @param year 年度
 * @param id primary key uuid
 */
export function createDBCourse(c: PCourse, year: number, id: string): Course {
  const target = new Course()
  target.id = id
  target.code = c.code
  target.year = year
  target.name = c.name
  target.instructor = c.instructor
  target.credit = c.credits
  target.overview = c.overview
  target.remarks = c.remarks
  target.lastUpdate = c.lastUpdate
  target.recommendedGrades = c.recommendedGrade.map((g) => {
    const r = new CourseRecommendedGrade()
    r.grade = g
    return r
  })
  target.methods = parseCourseMethod(c.remarks).map((m) => {
    const mm = new CourseMethod()
    mm.method = m
    return mm
  })
  target.schedules = c.schedules.map((s) => {
    const r = new CourseSchedule()
    r.module = createDBModule(s.module)
    r.day = createDBDay(s.day)
    r.period = s.period
    r.room = s.room
    return r
  })
  target.hasParseError = c.error
  return target
}
