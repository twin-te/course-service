import { CourseServiceClient } from '../generated/protos/CourseService_grpc_pb'
import { credentials } from '@grpc/grpc-js'
import {
  UpdateCourseDatabaseRequest,
  GetCoursesRequest,
  ListAllCoursesRequest,
  GetCoursesByCodeRequest,
  GetCoursesByCodeRequestCondition,
  GetCoursesResponse,
} from '../generated/protos/CourseService_pb'
import { startServer, stopServer } from '../src/grpc'
import { mocked } from 'ts-jest/utils'
import { fetchCoursesFromKdbUseCase } from '../src/usecase/fetchCoursesFromKdb'
import { updateCourseDatabaseUseCase } from '../src/usecase/updateCourseDatabase'
import { v4 } from 'uuid'
import { loadTestData } from './_loadTestData'
import { getCoursesUseCase } from '../src/usecase/getCourses'
import { createDBCourse } from '../src/utils/converter'
import { listAllCoursesUseCase } from '../src/usecase/listAllCourses'
import { Status } from '@grpc/grpc-js/build/src/constants'
import { NoCoursesFoundError } from 'twinte-parser'
import { getCoursesByCodeUseCase } from '../src/usecase/getCoursesByCode'

jest.mock('../src/usecase/fetchCoursesFromKdb')
jest.mock('../src/usecase/updateCourseDatabase')
jest.mock('../src/usecase/getCourses')
jest.mock('../src/usecase/getCoursesByCode')
jest.mock('../src/usecase/listAllCourses')

const testData = loadTestData()

let client: CourseServiceClient

beforeAll(async () => {
  await startServer()
  client = new CourseServiceClient(
    'localhost:50051',
    credentials.createInsecure()
  )
})

test(
  'updateCourseDatabase',
  (done) => {
    mocked(fetchCoursesFromKdbUseCase).mockImplementation(async (_) => testData)
    mocked(updateCourseDatabaseUseCase).mockImplementation(
      async (year, courses) => ({
        insertedCourses: courses
          .filter((_, i) => i < courses.length / 5)
          .map((c) => ({
            id: v4(),
            code: c.code,
            name: c.name,
          })),
        updatedCourses: courses
          .filter((_, i) => i >= courses.length / 5)
          .map((c) => ({
            id: v4(),
            code: c.code,
            name: c.name,
          })),
      })
    )
    const req = new UpdateCourseDatabaseRequest()
    req.setYear(2020)
    client.updateCourseDatabase(req, (err, value) => {
      expect(err).toBeFalsy()
      expect(value).toBeTruthy()
      if (!value) throw new Error()
      expect(value.getInsertedcoursesList().length).toBe(testData.length / 5)
      expect(value.getUpdatedcoursesList().length).toBe(
        (testData.length / 5) * 4
      )

      done()
    })
  },
  1000 * 60 * 10
)

test(
  'updateCourseDatabase:NoCoursesFoundError',
  (done) => {
    mocked(fetchCoursesFromKdbUseCase).mockImplementation(async (_) => {
      throw new NoCoursesFoundError()
    })
    mocked(updateCourseDatabaseUseCase).mockImplementation(
      async (year, courses) => ({
        insertedCourses: [],
        updatedCourses: [],
      })
    )
    const req = new UpdateCourseDatabaseRequest()
    req.setYear(2020)
    client.updateCourseDatabase(req, (err, value) => {
      expect(err).toBeTruthy()
      if (!err) throw new Error()
      expect(err.code).toBe(Status.UNKNOWN)
      expect(err.details).toBe('Search results are empty')
      done()
    })
  },
  1000 * 60 * 10
)

test('getCourses', async (done) => {
  const testids = [v4(), v4()]
  mocked(getCoursesUseCase).mockImplementation(async (ids) => [
    createDBCourse(testData[0], 2020, ids[0]),
    createDBCourse(testData[1], 2020, ids[1]),
  ])
  const req = new GetCoursesRequest()
  req.setIdsList(testids)
  client.getCourses(req, (err, res) => {
    expect(err).toBeNull()
    expect(res).toBeTruthy()
    if (!res) throw new Error()
    res.getCoursesList().forEach((c, i) => {
      expect(c.getId()).toBe(testids[i])
    })
    done()
  })
})

test('getCourses:notfound', async (done) => {
  const testids = [v4(), v4()]
  mocked(getCoursesUseCase).mockImplementation(async (ids) => [])
  const req = new GetCoursesRequest()
  req.setIdsList(testids)
  client.getCourses(req, (err, _) => {
    expect(err).toBeTruthy()
    if (!err) throw new Error()
    expect(err.code).toBe(Status.NOT_FOUND)
    expect(typeof err.metadata.get('ids')[0]).toBe('string')
    expect((err.metadata.get('ids')[0] as string).split(',')).toEqual(testids)
    done()
  })
})

test('getCourses:notfound2', async (done) => {
  const testids = [v4(), v4()]
  mocked(getCoursesUseCase).mockImplementation(async (ids) => [
    createDBCourse(testData[0], 2020, testids[0]),
  ])
  const req = new GetCoursesRequest()
  req.setIdsList(testids)
  client.getCourses(req, (err, _) => {
    expect(err).toBeTruthy()
    if (!err) throw new Error()
    expect(err.code).toBe(Status.NOT_FOUND)
    expect(typeof err.metadata.get('ids')[0]).toBe('string')
    expect(err.metadata.get('ids')[0]).toEqual(testids[1])
    done()
  })
})

test('getCourses:duplicated ids', async (done) => {
  const testid = v4()
  mocked(getCoursesUseCase).mockImplementation(async (ids) => [])
  const req = new GetCoursesRequest()
  req.setIdsList([testid, testid])
  client.getCourses(req, (err, _) => {
    expect(err).toBeTruthy()
    if (!err) throw new Error()
    expect(err.code).toBe(Status.INVALID_ARGUMENT)
    done()
  })
})

test('getCoursesByCode', async (done) => {
  const conditions = [
    { year: 2020, code: testData[0].code },
    { year: 2020, code: testData[1].code },
  ]
  mocked(getCoursesByCodeUseCase).mockImplementation(async (ids) => [
    createDBCourse(testData[0], 2020, v4()),
    createDBCourse(testData[1], 2020, v4()),
  ])
  const req = new GetCoursesByCodeRequest()
  req.setConditionsList(
    conditions.map((c) => {
      const r = new GetCoursesByCodeRequestCondition()
      r.setYear(c.year)
      r.setCode(c.code)
      return r
    })
  )
  client.getCoursesByCode(req, (err, res) => {
    expect(err).toBeNull()
    expect(res).toBeTruthy()
    if (!res) throw new Error()
    res.getCoursesList().forEach((c, i) => {
      expect(c.getYear()).toBe(conditions[i].year)
      expect(c.getCode()).toBe(conditions[i].code)
    })
    done()
  })
})

test('getCoursesByCode:notfound', async (done) => {
  const conditions = [
    { year: 2020, code: testData[0].code },
    { year: 2020, code: testData[1].code },
  ]
  mocked(getCoursesByCodeUseCase).mockImplementation(async (ids) => [])
  const req = new GetCoursesByCodeRequest()
  req.setConditionsList(
    conditions.map((c) => {
      const r = new GetCoursesByCodeRequestCondition()
      r.setYear(c.year)
      r.setCode(c.code)
      return r
    })
  )
  client.getCoursesByCode(req, (err, _) => {
    expect(err).toBeTruthy()
    if (!err) throw new Error()
    expect(err.code).toBe(Status.NOT_FOUND)
    expect(typeof err.metadata.get('conditions')[0]).toBe('string')
    // expect((err.metadata.get('conditions')[0] as string).split(',')).toEqual(testids)
    done()
  })
})

test('getCoursesByCode:notfound2', async (done) => {
  const conditions = [
    { year: 2020, code: testData[0].code },
    { year: 2020, code: testData[1].code },
  ]
  mocked(getCoursesByCodeUseCase).mockImplementation(async (ids) => [
    createDBCourse(testData[0], 2020, v4()),
  ])
  const req = new GetCoursesByCodeRequest()
  req.setConditionsList(
    conditions.map((c) => {
      const r = new GetCoursesByCodeRequestCondition()
      r.setYear(c.year)
      r.setCode(c.code)
      return r
    })
  )
  client.getCoursesByCode(req, (err, _) => {
    expect(err).toBeTruthy()
    if (!err) throw new Error()
    expect(err.code).toBe(Status.NOT_FOUND)
    expect(typeof err.metadata.get('conditions')[0]).toBe('string')
    // expect(err.metadata.get('conditions')[0]).toEqual(testids[1])
    done()
  })
})

test('getCoursesByCode:duplicated conditions', async (done) => {
  const conditions = [
    { year: 2020, code: testData[0].code },
    { year: 2020, code: testData[0].code },
  ]
  mocked(getCoursesByCodeUseCase).mockImplementation(async (ids) => [])
  const req = new GetCoursesByCodeRequest()
  req.setConditionsList(
    conditions.map((c) => {
      const r = new GetCoursesByCodeRequestCondition()
      r.setYear(c.year)
      r.setCode(c.code)
      return r
    })
  )
  client.getCoursesByCode(req, (err, _) => {
    expect(err).toBeTruthy()
    if (!err) throw new Error()
    expect(err.code).toBe(Status.INVALID_ARGUMENT)
    done()
  })
})

test('listAllCourses', async (done) => {
  mocked(listAllCoursesUseCase).mockImplementation(async () =>
    testData.map((c) => createDBCourse(c, 2020, v4()))
  )
  const req = new ListAllCoursesRequest()
  client.listAllCourses(req, (err, res) => {
    expect(err).toBeNull()
    expect(res).toBeTruthy()
    if (!res) throw new Error()

    expect(res.getCoursesList().length).toBe(testData.length)
    done()
  })
})

afterAll(() => {
  client.close()
  stopServer()
})
