import { getConnection } from 'typeorm'
import { Course } from '../model/course'

/**
 * すべてのコース一覧を取得する
 */
export async function listAllCoursesUseCase(): Promise<Course[]> {
  const repository = getConnection().getRepository(Course)
  return repository.find({
    relations: ['recommendedGrades', 'methods', 'schedules'],
  })
}

export type listAllCoursesUseCaseType = typeof listAllCoursesUseCase
