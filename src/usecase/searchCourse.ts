/* eslint-disable camelcase */
import { getConnection, In, Raw } from 'typeorm'
import { Day, Module } from '../database/model/enums'
import { Course } from '../database/model/course'

export enum SearchMode {
  Cover, // 指定した時限と講義の開講日時が一部でも被っていれば対象とみなす
  Contain, // 指定した時限に収まっている講義のみ対象とみなす
}

type Input = {
  /** 存在しない場合は全時限対象 */
  timetable?: {
    [module in keyof typeof Module]?: {
      [day in keyof typeof Day]?: boolean[] // bool配列は[0限, 1限, ... , 8限] (0限は時限情報が無い講義に与えられている)
    }
  }
  keywords: string[]
  year: number
  searchMode: SearchMode
}

export async function searchCourseUseCase({
  year,
  timetable,
  keywords,
  searchMode,
}: Input): Promise<Course[]> {
  const repo = getConnection().getRepository(Course)

  // 時間の指定がある場合
  if (timetable) {
    const conditions = Object.keys(timetable) // 全てのmoduleについて
      .map((module) =>
        Object.keys(timetable[parseInt(module)]!) // 全てのdayについて
          .filter((day) => {
            // 空配列or全てfalseの列は除外する
            const periods = timetable[parseInt(module)]![parseInt(day)]
            return periods && periods.length > 0 && periods.includes(true)
          })
          .map((day) => {
            // 指定された時限だけが数値で入っている配列
            const periods = (timetable[parseInt(module)]![
              parseInt(day)
            ] as boolean[])
              .map((v, i) => (v ? i : null))
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
    let sql = `
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
                    : ''
                }
              )`
              )
              .join(' or ')}
          )
      `

    // containの場合、範囲外に授業を行ってる講義は除外するクエリを追加
    if (searchMode === SearchMode.Contain)
      sql += `
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
                : ''
            }
          )`
          )
          .join(' or ')}
      )
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
