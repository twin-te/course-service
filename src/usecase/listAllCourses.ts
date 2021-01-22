import { getConnection } from 'typeorm'
import { Course } from '../model/course'

export async function listAllCoursesUseCase(): Promise<Course[]> {
  const repository = getConnection().getRepository(Course)
  return repository.find({
    relations: ['recommendedGrades', 'methods', 'schedules'],
  })
}

export type listAllCoursesUseCaseType = typeof listAllCoursesUseCase
