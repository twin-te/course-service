import 'reflect-metadata'
import { createConnection, getConnection } from 'typeorm'
import { Course } from './model/course'
import { CourseMethod } from './model/courseMethod'
import { CourseRecommendedGrade } from './model/courseRecommendedGrade'
import { CourseSchedule } from './model/courseSchedule'
import { logger } from './logger'

/**
 * postgresへ接続
 */
export async function connectDatabase() {
  const config = {
    host: process.env.PG_HOST ?? 'postgres',
    port: parseInt(process.env.PG_PORT ?? '5432'),
    username: process.env.PG_USERNAME ?? 'postgres',
    password: process.env.PG_PASSWORD ?? 'postgres',
    database: process.env.PG_DATABASE ?? 'twinte_course_service',
  }

  logger.debug('postgres config', { ...config, password: '*****' })

  try {
    const conn = await createConnection({
      type: 'postgres',
      ...config,
      entities: [Course, CourseMethod, CourseRecommendedGrade, CourseSchedule],
      synchronize: true,
    })
    logger.info('connected to postgres.')
    return conn
  } catch (e) {
    logger.fatal('cannnot connect to database.', e)
    process.exit(1)
  }
}

/**
 * postgresから切断
 */
export function disconnectDatabase() {
  return getConnection().close()
}
