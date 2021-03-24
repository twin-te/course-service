import { getConnection } from 'typeorm'
import { Course } from '../database/model/course'
import { InvalidArgumentError, NotFoundError } from '../error'

type GetCoursesByCodeUseCaseProps = {
  year: number
  code: string
}[]

/**
 * 指定された年度と科目番号から情報を取得する
 * @param props 条件
 * @param suppressNotFoundError 一部の講義が見つからなくてもエラーにしない
 */
export async function getCoursesByCodeUseCase(
  props: GetCoursesByCodeUseCaseProps,
  suppressNotFoundError: boolean = false
): Promise<Course[]> {
  if (
    props.length !==
    [...new Set(props.map((cc) => `${cc.year}${cc.code}`))].length
  )
    throw new InvalidArgumentError(
      '指定された引数に重複したidが含まれています。'
    )
  const repository = getConnection().getRepository(Course)
  const res = await repository.find({
    where: props,
    relations: ['recommendedGrades', 'methods', 'schedules'],
  })
  if (res.length !== props.length && !suppressNotFoundError)
    throw new NotFoundError(
      '指定されたidのコースが見つかりませんでした',
      undefined,
      props
        .filter((i) => !res.find((c) => c.year === i.year && c.code === i.code))
        .map((p) => `${p.year}:${p.code}`)
    )
  else return res
}
