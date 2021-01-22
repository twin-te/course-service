import { Course as ParsedCourse } from 'twinte-parser'
import { getConnection } from 'typeorm'
import { Course } from '../model/course'

import { v4 } from 'uuid'
import { createDBCourse } from '../utils/converter'

type ReportCourseData = {
  id: string
  code: string
  name: string
}

type UpdateCourseDatabaseResult = {
  insertedCourses: ReportCourseData[]
  updatedCourses: ReportCourseData[]
}

/**
 * 与えられた情報からデータベースを更新する
 * @param year 更新年次
 * @param courses parserで解析された開講情報
 */
export async function updateCourseDatabaseUseCase(
  year: number,
  courses: ParsedCourse[]
): Promise<UpdateCourseDatabaseResult> {
  const result: UpdateCourseDatabaseResult = {
    insertedCourses: [],
    updatedCourses: [],
  }

  await getConnection().transaction(async (manager) => {
    const courseRepository = manager.getRepository(Course)
    for (let i = 0; i < courses.length; i++) {
      const c = courses[i]
      let target = await courseRepository.findOne({ code: c.code, year })
      const isNew = !target

      // 新規の場合
      if (!target) target = createDBCourse(c, year, v4())
      // 更新不要の場合何もしない
      else if (target.lastUpdate.getTime() >= c.lastUpdate.getTime()) continue
      else target = createDBCourse(c, year, target.id)

      await courseRepository.save(target)

      if (isNew) {
        result.insertedCourses.push({
          id: target.id,
          code: target.code,
          name: target.name,
        })
      } else {
        result.updatedCourses.push({
          id: target.id,
          code: target.code,
          name: target.name,
        })
      }
    }
  })
  return result
}

export type updateCourseDatabaseUseCaseType = typeof updateCourseDatabaseUseCase
