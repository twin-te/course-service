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
  ISearchCourseRequestModules,
  ListAllCoursesResponse,
  SearchCourseResponse,
  UpdateCourseDatabaseResponse,
} from '../../generated'
import { toGrpcError } from './converter'
import { searchCourseUseCase } from '../usecase/searchCourse'
import { Day, Module } from '../database/model/enums'

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
      callback(toGrpcError(e))
    }
  },

  async getCourses({ request }, callback) {
    try {
      const ids = request.ids
      const courses = await getCoursesUseCase(ids)
      callback(
        null,
        GetCoursesResponse.create({
          courses: courses.map(createGrpcCourse),
        })
      )
    } catch (e) {
      callback(toGrpcError(e))
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
      callback(toGrpcError(e))
    }
  },

  async getCoursesByCode({ request }, callback) {
    try {
      const conditions = request.conditions
      const courses = await getCoursesByCodeUseCase(
        conditions.map((cc) => ({ year: cc.year, code: cc.code })),
        request.suppressNotFoundError
      )

      callback(
        null,
        GetCoursesByCodeResponse.create({
          courses: courses.map(createGrpcCourse),
        })
      )
    } catch (e) {
      callback(toGrpcError(e))
    }
  },
  async searchCourse({ request }, callback) {
    try {
      const courses = await searchCourseUseCase(request)

      callback(
        null,
        SearchCourseResponse.create({ courses: courses.map(createGrpcCourse) })
      )
    } catch (e) {
      callback(toGrpcError(e))
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
          logger.trace('REQUEST', originalImpl.name, call.request)
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
