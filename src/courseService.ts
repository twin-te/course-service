import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
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

export const courseService: ICourseServiceServer = {
  async updateCourseDatabase(
    call: ServerUnaryCall<
      UpdateCourseDatabaseRequest,
      UpdateCourseDatabaseResponse
    >,
    callback: sendUnaryData<UpdateCourseDatabaseResponse>
  ) {
    const res = new UpdateCourseDatabaseResponse()
    try {
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

  getCourses(
    call: ServerUnaryCall<GetCoursesRequest, GetCoursesResponse>,
    callback: sendUnaryData<GetCoursesResponse>
  ) {
    getCoursesUseCase(call.request.getIdsList())
      .then((courses) => {
        const res = new GetCoursesResponse()
        res.setCoursesList(courses.map(convertCourse))
        callback(null, res)
      })
      .catch((r) => callback(r))
  },

  listAllCourses(
    call: ServerUnaryCall<ListAllCoursesRequest, ListAllCoursesResponse>,
    callback: sendUnaryData<ListAllCoursesResponse>
  ) {
    listAllCoursesUseCase().then((courses) => {
      const res = new ListAllCoursesResponse()
      res.setCoursesList(courses.map(convertCourse))
      callback(null, res)
    })
  },
}

function convertCourse(c: dbCourse): Course {
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
