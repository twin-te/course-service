import { getConnection } from 'typeorm'
import { Course } from '../src/model/course'
import { CourseRecommendedGrade } from '../src/model/courseRecommendedGrade'
import { CourseSchedule } from '../src/model/courseSchedule'
import { CourseMethod } from '../src/model/courseMethod'

export async function clearDB() {
  await getConnection().getRepository(CourseMethod).delete({})
  await getConnection().getRepository(CourseRecommendedGrade).delete({})
  await getConnection().getRepository(CourseSchedule).delete({})
  await getConnection().getRepository(Course).delete({})
}
