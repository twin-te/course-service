import { getConnection } from 'typeorm'
import { Course } from '../src/database/model/course'
import { CourseRecommendedGrade } from '../src/database/model/courseRecommendedGrade'
import { CourseSchedule } from '../src/database/model/courseSchedule'
import { CourseMethod } from '../src/database/model/courseMethod'

export async function clearDB() {
  await getConnection().getRepository(CourseMethod).delete({})
  await getConnection().getRepository(CourseRecommendedGrade).delete({})
  await getConnection().getRepository(CourseSchedule).delete({})
  await getConnection().getRepository(Course).delete({})
}
