import { getConnection } from 'typeorm'
import { Course } from '../database/model/course'

/**
 * 指定されたIDの授業を取得する
 * @param ids 取得したい授業のID配列
 */
export async function getCoursesUseCase(ids: string[]): Promise<Course[]> {
  const repository = getConnection().getRepository(Course)
  return repository.findByIds(ids, {
    relations: ['recommendedGrades', 'methods', 'schedules'],
  })
}

export type getCoursesUseCaseType = typeof getCoursesUseCase
