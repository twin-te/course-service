/* eslint-disable camelcase */
import { getConnection, In, Raw } from 'typeorm'
import { Day, Module } from '../database/model/enums'
import { Course } from '../database/model/course'
import { connectDatabase } from '../database'

type Input = {
  timetable?: {
    [module in keyof typeof Module]?: {
      [day in keyof typeof Day]?: boolean[]
    }
  }
  keywords: string[]
  year: number
}

export async function searchCourseUseCase({
  year,
  timetable,
  keywords,
}: Input): Promise<Course[]> {
  const repo = getConnection().getRepository(Course)

  // 時間の指定がある場合
  if (timetable) {
    const conditions = Object.keys(timetable)
      .map((module) =>
        Object.keys(timetable[parseInt(module)]!).map((day) => {
          // 指定された時限だけが数値で入っている配列
          const periods = (timetable[parseInt(module)]![
            parseInt(day)
          ] as boolean[])
            .map((v, i) => (v ? i + 1 : null))
            .filter((v): v is number => v !== null)

          return {
            module: parseInt(module) as Module,
            day: parseInt(day) as Day,
            periods,
          }
        })
      )
      .flat()

    // 検索結果のcourse.idのみ吐くクエリ
    const sql = `
        -- 1. リクエストされた時限に開講されている授業を取得
        select distinct(courses.id) from courses
            join course_schedules as s on s.course_id=courses.id
            where
              courses.year = :year and
              (courses.name ~* :keywords or courses.code ~* :keywords) AND
              (
                ${conditions
                  .map(
                    ({ periods }, i) => `(
                    s.module = :m_${i} and
                    s.day = :d_${i}
        
                    ${
                      periods.length > 0
                        ? `
                    and s.period in(${periods
                      .map((_, ii) => `:p_${i}_${ii}`)
                      .join(',')})
                    `
                        : 'true'
                    }
                  )`
                  )
                  .join(' or ')}
              )
        except -- 3. 差集合をとる
        -- 2. リクエストされた時限外に開講されている授業を取得
        select distinct(courses.id) from courses 
          join course_schedules as s on s.course_id=courses.id
          where
            courses.year = :year and
            (courses.name ~* :keywords or courses.code ~* :keywords) and (
            ${conditions
              .map(
                ({ periods }, i) => `(
                s.module <> :m_${i} or
                s.day <> :d_${i}
    
                ${
                  periods.length > 0
                    ? `
                or s.period not in(${periods
                  .map((_, ii) => `:p_${i}_${ii}`)
                  .join(',')})
                `
                    : 'false'
                }
              )`
              )
              .join(' or ')}
          )
      ;  
      `
    const parameters: any = { keywords: keywords.join('|'), year }
    conditions.forEach(({ module, day, periods }, i) => {
      parameters[`m_${i}`] = module
      parameters[`d_${i}`] = day
      periods.forEach((p, ii) => {
        parameters[`p_${i}_${ii}`] = p
      })
    })

    const [
      escapedQuery,
      escapedParameters,
    ] = getConnection().driver.escapeQueryWithParameters(sql, parameters, {})

    // 検索結果の講義id配列
    const ids = (await repo.query(escapedQuery, escapedParameters)).map(
      (r: any) => r.id
    )
    // 人力パースは大変なのでデータを取得するのはTypeORMに任せる
    return repo.findByIds(ids, {
      relations: ['schedules', 'methods', 'recommendedGrades'],
    })
  } else {
    return repo.find({
      relations: ['schedules', 'methods', 'recommendedGrades'],
      where: [
        {
          year,
          name: Raw((alias) => `${alias} ~* :keywords`, {
            keywords: keywords.join('|'),
          }),
        },
        {
          year,
          code: Raw((alias) => `${alias} ~* :keywords`, {
            keywords: keywords.join('|'),
          }),
        },
      ],
    })
  }
}
