import { getConnection } from 'typeorm'
import { Course } from '../database/model/course'
import { InvalidArgumentError, NotFoundError } from '../error'

/**
 * 指定されたIDの授業を取得する
 * @param ids 取得したい授業のID配列
 */
export async function getCoursesUseCase(ids: string[]): Promise<Course[]> {
  if (ids.length !== [...new Set(ids)].length)
    throw new InvalidArgumentError(
      '指定された引数に重複したidが含まれています。'
    )

  const repository = getConnection().getRepository(Course)
  const res = await repository.findByIds(ids, {
    relations: ['recommendedGrades', 'methods', 'schedules'],
  })

  if (res.length !== ids.length)
    throw new NotFoundError(
      '指定されたidのコースが見つかりませんでした',
      undefined,
      ids.filter((i) => !res.find((r) => r.id === i))
    )
  else return res
}

export type getCoursesUseCaseType = typeof getCoursesUseCase
