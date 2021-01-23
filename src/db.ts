import 'reflect-metadata'
import { createConnection, getConnection } from 'typeorm'
import { Course } from './model/course'
import { CourseMethod } from './model/courseMethod'
import { CourseRecommendedGrade } from './model/courseRecommendedGrade'
import { CourseSchedule } from './model/courseSchedule'

/**
 * postgresへ接続
 */
export function connectDatabase() {
  return createConnection({
    type: 'postgres',
    host: process.env.PG_HOST ?? 'postgres',
    port: parseInt(process.env.PG_PORT ?? '5432'),
    username: process.env.PG_USERNAME ?? 'postgres',
    password: process.env.PG_PASSWORD ?? 'postgres',
    database: process.env.PG_DATABASE ?? 'twinte_course_service',
    entities: [Course, CourseMethod, CourseRecommendedGrade, CourseSchedule],
    synchronize: true,
  })
}

/**
 * postgresから切断
 */
export function disconnectDatabase() {
  return getConnection().close()
}
