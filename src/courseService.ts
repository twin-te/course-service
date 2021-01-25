import {
  Metadata,
  sendUnaryData,
  ServerUnaryCall,
  UntypedServiceImplementation,
} from '@grpc/grpc-js'
import { ICourseServiceServer } from '../generated/protos/CourseService_grpc_pb'
import {
  Course,
  CourseSchedule,
  GetCoursesRequest,
  GetCoursesResponse,
  ListAllCoursesRequest,
  ListAllCoursesResponse,
  ReportCourseData,
  UpdateCourseDatabaseRequest,
  UpdateCourseDatabaseResponse,
} from '../generated/protos/CourseService_pb'
import { fetchCoursesFromKdbUseCase } from './usecase/fetchCoursesFromKdb'
import { getCoursesUseCase } from './usecase/getCourses'
import { updateCourseDatabaseUseCase } from './usecase/updateCourseDatabase'
import { Course as dbCourse } from './model/course'
import { listAllCoursesUseCase } from './usecase/listAllCourses'
import { Status } from '@grpc/grpc-js/build/src/constants'
import { grpcLogger as logger } from './logger'
import {
  ServerErrorResponse,
  ServerStatusResponse,
} from '@grpc/grpc-js/build/src/server-call'

/**
 * grpcサーバのCourseService実装
 */
export const courseService: ICourseServiceServer = applyLogger({
  async updateCourseDatabase(
    call: ServerUnaryCall<
      UpdateCourseDatabaseRequest,
      UpdateCourseDatabaseResponse
    >,
    callback: sendUnaryData<UpdateCourseDatabaseResponse>
  ) {
    try {
      const res = new UpdateCourseDatabaseResponse()
      const courses = await fetchCoursesFromKdbUseCase(call.request.getYear())
      const updateResult = await updateCourseDatabaseUseCase(
        call.request.getYear(),
        courses
      )
      res.setInsertedcoursesList(
        updateResult.insertedCourses.map((c) => {
          const d = new ReportCourseData()
          d.setId(c.id)
          d.setName(c.name)
          d.setCode(c.code)
          return d
        })
      )
      res.setUpdatedcoursesList(
        updateResult.updatedCourses.map((c) => {
          const d = new ReportCourseData()
          d.setId(c.id)
          d.setName(c.name)
          d.setCode(c.code)
          return d
        })
      )

      callback(null, res)
    } catch (e) {
      callback(e)
    }
  },

  async getCourses(
    call: ServerUnaryCall<GetCoursesRequest, GetCoursesResponse>,
    callback: sendUnaryData<GetCoursesResponse>
  ) {
    try {
      const res = new GetCoursesResponse()
      const ids = call.request.getIdsList()

      if (ids.length !== [...new Set(ids)].length) {
        callback({
          code: Status.INVALID_ARGUMENT,
          details: `指定された引数に重複したidが含まれています。`,
        })
        return
      }

      const courses = await getCoursesUseCase(ids)
      if (courses.length !== call.request.getIdsList().length) {
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
      res.setCoursesList(courses.map(createGrpcCourse))
      callback(null, res)
    } catch (e) {
      callback(e)
    }
  },

  async listAllCourses(
    call: ServerUnaryCall<ListAllCoursesRequest, ListAllCoursesResponse>,
    callback: sendUnaryData<ListAllCoursesResponse>
  ) {
    try {
      const courses = await listAllCoursesUseCase()
      const res = new ListAllCoursesResponse()
      res.setCoursesList(courses.map(createGrpcCourse))
      callback(null, res)
    } catch (e) {
      callback(e)
    }
  },
})

/**
 * grpcの構造体へ変換
 * @param c データベースのCourseModel
 */
function createGrpcCourse(c: dbCourse): Course {
  const d = new Course()
  d.setId(c.id)
  d.setCode(c.code)
  d.setYear(c.year)
  d.setName(c.name)
  d.setInstructor(c.instructor)
  d.setCredit(c.credit)
  d.setOverview(c.overview)
  d.setRemarks(c.remarks)
  d.setLastupdate(c.lastUpdate.toISOString())
  d.setRecomendedgradesList(c.recommendedGrades.map((r) => r.grade))
  d.setMethodsList(c.methods.map((m) => m.method))
  d.setSchedulesList(
    c.schedules.map((s) => {
      const ss = new CourseSchedule()
      ss.setModule(s.module)
      ss.setDay(s.day)
      ss.setPeriod(s.period)
      ss.setRoom(s.room)
      return ss
    })
  )
  d.setHasparseerror(c.hasParseError)
  return d
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
