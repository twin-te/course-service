import { StatusObject, Metadata } from '@grpc/grpc-js'
import { Status } from '@grpc/grpc-js/build/src/constants'
import { ServerErrorResponse } from '@grpc/grpc-js/build/src/server-call'
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
import {
  NotFoundError,
  InvalidArgumentError,
  AlreadyExistError,
} from '../error'

/**
 * パーサのModule enumをデータベースのenumへ変換
 * @param m パーサのModule
 */
export function createDBModule(m: PModule): Module {
  return (
    Object.values(Module)[Object.values(PModule).indexOf(m)] ?? Module.Unknown
  )
}

/**
 * パーサのDay enumをデータベースのenum変換
 * @param d パーサのDay
 */
export function createDBDay(d: PDay): Day {
  return Object.values(Day)[Object.values(PDay).indexOf(d)] ?? Day.Unknown
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

  // 通年かどうか
  target.isAnnual = !!c.schedules.find((s) => s.module === PModule.Annual)

  // 通年のスケジュールを春ABC秋ABCに変換
  const schedules = c.schedules
    .map((s) =>
      s.module === PModule.Annual
        ? [
            PModule.SpringA,
            PModule.SpringB,
            PModule.SpringC,
            PModule.FallA,
            PModule.FallB,
            PModule.FallC,
          ].map((m) => ({
            ...s,
            module: m,
          }))
        : s
    )
    .flat()

  target.schedules = schedules.map((s) => {
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

export function toGrpcError(
  e: Error
): Partial<StatusObject> | ServerErrorResponse {
  if (e instanceof NotFoundError)
    return Object.assign(e, {
      code: Status.NOT_FOUND,
      metadata: makeMetadata({ resources: e.resources }),
    })
  else if (e instanceof InvalidArgumentError)
    return Object.assign(e, {
      code: Status.INVALID_ARGUMENT,
      metadata: makeMetadata({ args: e.args }),
    })
  else if (e instanceof AlreadyExistError)
    return Object.assign(e, {
      code: Status.ALREADY_EXISTS,
    })
  else return Object.assign(e, { code: Status.UNKNOWN })
}

function makeMetadata(obj: any): Metadata {
  const metadata = new Metadata()
  Object.keys(obj).forEach((k) => metadata.add(k, obj[k]))
  return metadata
}
