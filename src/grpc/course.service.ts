import {
  Metadata,
  sendUnaryData,
  ServerUnaryCall,
  UntypedServiceImplementation,
} from '@grpc/grpc-js'
import { fetchCoursesFromKdbUseCase } from '../usecase/fetchCoursesFromKdb'
import { getCoursesUseCase } from '../usecase/getCourses'
import { updateCourseDatabaseUseCase } from '../usecase/updateCourseDatabase'
import { getCoursesByCodeUseCase } from '../usecase/getCoursesByCode'
import { Course as dbCourse } from '../database/model/course'
import { listAllCoursesUseCase } from '../usecase/listAllCourses'
import { Status } from '@grpc/grpc-js/build/src/constants'
import { grpcLogger as logger } from '../logger'
import {
  ServerErrorResponse,
  ServerStatusResponse,
} from '@grpc/grpc-js/build/src/server-call'
import { GrpcServer } from './type'
import {
  CourseService,
  GetCoursesByCodeResponse,
  GetCoursesResponse,
  ICourse,
  ICourseSchedule,
  ListAllCoursesResponse,
  UpdateCourseDatabaseResponse,
} from '../../generated'

/**
 * grpcサーバのCourseService実装
 */
export const courseService: GrpcServer<CourseService> = applyLogger({
  async updateCourseDatabase({ request }, callback) {
    try {
      const courses = await fetchCoursesFromKdbUseCase(request.year)
      const updateResult = await updateCourseDatabaseUseCase(
        request.year,
        courses
      )
      callback(
        null,
        UpdateCourseDatabaseResponse.create({
          ...updateResult,
        })
      )
    } catch (e) {
      callback(e)
    }
  },

  async getCourses({ request }, callback) {
    try {
      const ids = request.ids

      if (ids.length !== [...new Set(ids)].length) {
        callback({
          code: Status.INVALID_ARGUMENT,
          details: `指定された引数に重複したidが含まれています。`,
        })
        return
      }

      const courses = await getCoursesUseCase(ids)
      if (courses.length !== request.ids.length) {
        const metadata = new Metadata()
        const missing = ids.filter((i) => !courses.find((c) => c.id === i))
        metadata.set('ids', missing.join(','))
        callback({
          code: Status.NOT_FOUND,
          details: `指定されたIDの講義が見つかりませんでした。詳細はmetadataを参照してください。`,
          metadata,
        })
        return
      }
      callback(
        null,
        GetCoursesResponse.create({
          courses: courses.map(createGrpcCourse),
        })
      )
    } catch (e) {
      callback(e)
    }
  },

  async listAllCourses(call, callback) {
    try {
      const courses = await listAllCoursesUseCase()
      callback(
        null,
        ListAllCoursesResponse.create({
          courses: courses.map(createGrpcCourse),
        })
      )
    } catch (e) {
      callback(e)
    }
  },

  async getCoursesByCode({ request }, callback) {
    try {
      const conditions = request.conditions
      if (
        conditions.length !==
        [...new Set(conditions.map((cc) => `${cc.year}${cc.code}`))].length
      ) {
        callback({
          code: Status.INVALID_ARGUMENT,
          details: `指定された引数に重複したidが含まれています。`,
        })
        return
      }

      const courses = await getCoursesByCodeUseCase(
        conditions.map((cc) => ({ year: cc.year, code: cc.code }))
      )

      if (courses.length !== conditions.length) {
        const metadata = new Metadata()
        const missing = conditions.filter(
          (i) => !courses.find((c) => c.year === i.year && c.code === i.code)
        )
        metadata.set('conditions', missing.join(','))
        callback({
          code: Status.NOT_FOUND,
          details: `指定された条件の講義が見つかりませんでした。詳細はmetadataを参照してください。`,
          metadata,
        })
        return
      }
      callback(
        null,
        GetCoursesByCodeResponse.create({
          courses: courses.map(createGrpcCourse),
        })
      )
    } catch (e) {
      callback(e)
    }
  },
})

/**
 * grpcの構造体へ変換
 * @param c データベースのCourseModel
 */
function createGrpcCourse({
  lastUpdate,
  recommendedGrades,
  methods,
  schedules,
  ...c
}: dbCourse): ICourse {
  return {
    lastUpdate: lastUpdate.toISOString(),
    recommendedGrades: recommendedGrades.map((r) => r.grade),
    methods: methods.map((m) => m.method),
    schedules: (schedules as unknown) as ICourseSchedule[],
    ...c,
  }
}

function applyLogger<T extends UntypedServiceImplementation>(i: T): T {
  const impl = i as UntypedServiceImplementation
  Object.getOwnPropertyNames(impl)
    .filter((k) => typeof impl[k] === 'function')
    .forEach((k) => {
      const originalImpl = impl[k]
      impl[k] = function (
        call: ServerUnaryCall<any, any>,
        callback: sendUnaryData<any>
      ) {
        if (logger.isTraceEnabled())
          logger.trace('REQUEST', originalImpl.name, call.request.toObject())
        else logger.info('REQUEST', originalImpl.name)

        const originalCallback = callback
        callback = function (
          error: ServerErrorResponse | ServerStatusResponse | null,
          value?: any | null,
          trailer?: Metadata,
          flags?: number
        ) {
          if (error) logger.error('RESPONSE', originalImpl.name, error)
          else if (logger.isTraceEnabled())
            logger.trace('RESPONSE', originalImpl.name, {
              error,
              value: JSON.stringify(value),
              trailer,
              flags,
            })
          else logger.info('RESPONSE', originalImpl.name, 'ok')

          originalCallback(error, value, trailer, flags)
        }
        // @ts-ignore
        originalImpl(call, callback)
      }
    })
  return impl as T
}
