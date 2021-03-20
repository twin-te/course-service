import * as grpc from '@grpc/grpc-js'
import { startServer, stopServer } from '../../src/grpc'
import { mocked } from 'ts-jest/utils'
import { fetchCoursesFromKdbUseCase } from '../../src/usecase/fetchCoursesFromKdb'
import { updateCourseDatabaseUseCase } from '../../src/usecase/updateCourseDatabase'
import { v4 } from 'uuid'
import { loadTestData } from '../_loadTestData'
import { getCoursesUseCase } from '../../src/usecase/getCourses'
import { createDBCourse } from '../../src/grpc/converter'
import { listAllCoursesUseCase } from '../../src/usecase/listAllCourses'
import { Status } from '@grpc/grpc-js/build/src/constants'
import { NoCoursesFoundError } from 'twinte-parser'
import { getCoursesByCodeUseCase } from '../../src/usecase/getCoursesByCode'
import * as protoLoader from '@grpc/proto-loader'
import path from 'path'
import { ServiceClientConstructor } from '@grpc/grpc-js/build/src/make-client'
import {
  UpdateCourseDatabaseRequest,
  GetCoursesRequest,
  GetCoursesByCodeRequest,
  GetCoursesByCodeRequestCondition,
  ListAllCoursesRequest,
  CourseService,
} from '../../generated'
import { GrpcClient } from '../../src/grpc/type'
import { CourseSchedule } from '../../src/database/model/courseSchedule'
import { InvalidArgumentError, NotFoundError } from '../../src/error'
import { searchCourseUseCase, SearchMode } from '../../src/usecase/searchCourse'

jest.mock('../../src/usecase/fetchCoursesFromKdb')
jest.mock('../../src/usecase/updateCourseDatabase')
jest.mock('../../src/usecase/getCourses')
jest.mock('../../src/usecase/getCoursesByCode')
jest.mock('../../src/usecase/listAllCourses')
jest.mock('../../src/usecase/searchCourse')

const testData = loadTestData()

const def = protoLoader.loadSync(
  path.resolve(__dirname, `../../protos/CourseService.proto`)
)
const pkg = grpc.loadPackageDefinition(def)
const ClientConstructor = pkg.CourseService as ServiceClientConstructor

let client: GrpcClient<CourseService>

beforeAll(async () => {
  await startServer()
  client = (new ClientConstructor(
    'localhost:50051',
    grpc.ChannelCredentials.createInsecure()
  ) as unknown) as GrpcClient<CourseService>
})

describe('updateCourseDatabase', () => {
  test(
    'Success',
    (done) => {
      mocked(fetchCoursesFromKdbUseCase).mockImplementation(
        async (_) => testData
      )
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
      client.updateCourseDatabase({ year: 2020 }, (err, value) => {
        expect(err).toBeFalsy()
        expect(value).toBeTruthy()
        if (!value) throw new Error()
        expect(value.insertedCourses.length).toBe(testData.length / 5)
        expect(value.updatedCourses.length).toBe((testData.length / 5) * 4)

        done()
      })
    },
    1000 * 60 * 10
  )

  test(
    'NoCoursesFoundError',
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

      client.updateCourseDatabase({ year: 2020 }, (err, value) => {
        expect(err).toBeTruthy()
        if (!err) throw new Error()
        expect(err.code).toBe(Status.UNKNOWN)
        expect(err.details).toBe('Search results are empty')
        done()
      })
    },
    1000 * 60 * 10
  )
})

describe('getCourses', () => {
  test('Success', async (done) => {
    const testids = [v4(), v4()]
    mocked(getCoursesUseCase).mockImplementation(async (ids) => [
      createDBCourse(testData[0], 2020, ids[0]),
      createDBCourse(testData[1], 2020, ids[1]),
    ])
    client.getCourses({ ids: testids }, (err, res) => {
      expect(err).toBeNull()
      expect(res).toBeTruthy()
      if (!res) throw new Error()
      res.courses.forEach((c, i) => {
        expect(c.id).toBe(testids[i])
      })
      done()
    })
  })

  test('notfound', async (done) => {
    const testids = [v4(), v4()]
    mocked(getCoursesUseCase).mockImplementation(async (ids) => {
      throw new NotFoundError(
        '指定されたidのコースが見つかりませんでした',
        undefined,
        ids
      )
    })
    client.getCourses({ ids: testids }, (err, _) => {
      expect(err).toBeTruthy()
      expect(err?.code).toBe(Status.NOT_FOUND)
      expect(typeof err?.metadata.get('resources')[0]).toBe('string')
      expect((err?.metadata.get('resources')[0] as string).split(',')).toEqual(
        testids
      )
      done()
    })
  })

  test('invalid argument', async (done) => {
    mocked(getCoursesUseCase).mockImplementation(async (ids) => {
      throw new InvalidArgumentError()
    })
    client.getCourses({ ids: [] }, (err, _) => {
      expect(err).toBeTruthy()
      if (!err) throw new Error()
      expect(err.code).toBe(Status.INVALID_ARGUMENT)
      done()
    })
  })
})

describe('getCoursesByCode', () => {
  test('Success', async (done) => {
    const conditions = [
      { year: 2020, code: testData[0].code },
      { year: 2020, code: testData[1].code },
    ]
    mocked(getCoursesByCodeUseCase).mockImplementation(async (ids) => [
      createDBCourse(testData[0], 2020, v4()),
      createDBCourse(testData[1], 2020, v4()),
    ])
    client.getCoursesByCode({ conditions }, (err, res) => {
      expect(err).toBeNull()
      expect(res).toBeTruthy()
      if (!res) throw new Error()
      res.courses.forEach((c, i) => {
        expect(c.year).toBe(conditions[i].year)
        expect(c.code).toBe(conditions[i].code)
      })
      done()
    })
  })

  test('notfound', async (done) => {
    const conditions = [
      { year: 2020, code: testData[0].code },
      { year: 2020, code: testData[1].code },
    ]
    mocked(getCoursesByCodeUseCase).mockImplementation(async (ids) => {
      throw new NotFoundError(
        '指定されたidのコースが見つかりませんでした',
        undefined,
        ids.map((i) => `${i.year}:${i.code}`)
      )
    })
    client.getCoursesByCode({ conditions }, (err, _) => {
      expect(err).toBeTruthy()
      expect(err?.code).toBe(Status.NOT_FOUND)
      expect(typeof err?.metadata.get('resources')[0]).toBe('string')
      // expect((err.metadata.get('conditions')[0] as string).split(',')).toEqual(testids)
      done()
    })
  })

  test('invalid argument', async (done) => {
    const conditions = [
      { year: 2020, code: testData[0].code },
      { year: 2020, code: testData[1].code },
    ]
    mocked(getCoursesByCodeUseCase).mockImplementation(async (ids) => {
      throw new InvalidArgumentError()
    })
    client.getCoursesByCode({ conditions }, (err, _) => {
      expect(err).toBeTruthy()
      if (!err) throw new Error()
      expect(err.code).toBe(Status.INVALID_ARGUMENT)
      // expect(err.metadata.get('conditions')[0]).toEqual(testids[1])
      done()
    })
  })
})

describe('listAllCourses', () => {
  test('Success', async (done) => {
    mocked(listAllCoursesUseCase).mockImplementation(async () =>
      testData.map((c) => createDBCourse(c, 2020, v4()))
    )
    client.listAllCourses({}, (err, res) => {
      expect(err).toBeNull()
      expect(res).toBeTruthy()
      if (!res) throw new Error()

      expect(res.courses.length).toBe(testData.length)
      done()
    })
  })
})

describe('searchCourse', () => {
  test('success', (done) => {
    const req = {
      year: 2020,
      searchMode: SearchMode.Contain,
      keywords: ['情報', '線形'],
      timetable: {
        SpringA: {
          Mon: [false, true, true, true, true, true, true],
        },
      },
    }
    const resCourse = createDBCourse(testData[0], 2020, v4())
    mocked(searchCourseUseCase).mockImplementation(
      async ({ year, searchMode, keywords, timetable }) => {
        expect(year).toBe(req.year)
        expect(searchMode).toBe(req.searchMode)
        expect(keywords).toEqual(keywords)
        expect(timetable?.SpringA?.Mon).toEqual(req.timetable.SpringA.Mon)

        return [resCourse]
      }
    )

    client.searchCourse(req, (err, res) => {
      expect(err).toBeNull()
      expect(res?.courses[0].id).toEqual(resCourse.id)
      done()
    })
  })

  test('failure', (done) => {
    mocked(searchCourseUseCase).mockImplementation(() => {
      throw new Error('Unexpected Error!')
    })
    client.searchCourse({}, (err, res) => {
      expect(err?.code).toBe(Status.UNKNOWN)
      done()
    })
  })
})

afterAll(() => {
  client.close()
  stopServer()
})
