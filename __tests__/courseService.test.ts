import { CourseServiceClient } from '../generated/protos/CourseService_grpc_pb'
import { credentials } from '@grpc/grpc-js'
import {
  UpdateCourseDatabaseRequest,
  GetCoursesRequest,
  ListAllCoursesRequest,
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

jest.mock('../src/usecase/fetchCoursesFromKdb')
jest.mock('../src/usecase/updateCourseDatabase')
jest.mock('../src/usecase/getCourses')
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
        insertedCourses: courses.map((c) => ({
          id: v4(),
          code: c.code,
          name: c.name,
        })),
        updatedCourses: [],
      })
    )
    const req = new UpdateCourseDatabaseRequest()
    req.setYear(2020)
    client.updateCourseDatabase(req, (err, value) => {
      expect(err).toBeFalsy()
      expect(value).toBeTruthy()
      if (value) {
        expect(value.getInsertedcoursesList().length).toBe(testData.length)
      }
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
