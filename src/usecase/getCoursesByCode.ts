import { getConnection } from 'typeorm'
import { Course } from '../model/course'

type GetCoursesByCodeUseCaseProps = {
  year: number
  code: string
}[]

/**
 * 指定された年度と科目番号から情報を取得する
 * @param props 条件
 */
export function getCoursesByCodeUseCase(
  props: GetCoursesByCodeUseCaseProps
): Promise<Course[]> {
  const repository = getConnection().getRepository(Course)
  return repository.find({
    where: props,
    relations: ['recommendedGrades', 'methods', 'schedules'],
  })
}
