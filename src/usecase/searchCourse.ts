/* eslint-disable camelcase */
import { FindOneOptions, getConnection, In, Raw } from 'typeorm'
import { Day, Module } from '../database/model/enums'
import { Course } from '../database/model/course'
import { InvalidArgumentError } from '../error'

const escapeRegex = (str: string) =>
  str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')

/**
 * 指定されたキーワードをすべて含む文字列にヒットする正規表現を生成
 * 肯定先読みを使って順不同andを実装
 * 授業名等の検索で使用
 */
const searchNameRegexp = (names: string[]) =>
  '^' +
  names
    .map(escapeRegex)
    .map((n) => `(?=.*${n})`)
    .join('')

/**
 * 指定された科目番号に前方一致でヒットする正規表現を生成
 */
const searchCodeRegexp = (codes: string[]) =>
  `^(${codes.map(escapeRegex).join('|')})`

/**
 * キーワードと科目番号で検索する条件sqlを生成
 */
const keywordCodeQuery = (keywords: string[], codes: string[]): string => {
  // どちらも指定がなければ空文字を返す
  if (keywords.length === 0 && codes.length === 0) return ''

  // keywordかcodesが指定されていれば条件に加える（両方あればandで連結）
  const conditionQuery = [
    ifstr(keywords.length > 0, 'courses.name ~* :names'),
    ifstr(codes.length > 0, 'courses.code ~* :codes'),
  ]
    .filter(notNull)
    .join(' and ')

  // 最後に()で囲んでandを足す
  // 出力例 (courses.name ~* :names and courses.code ~* :codes) and
  return `(${conditionQuery}) and `
}

/**
 * 条件がtrueなら与えられた文字列、falseならnullを返すユーティリティ関数
 */
const ifstr = (cond: boolean, str: string) => (cond ? str : null)
/**
 * notNullを通すフィルタ
 */
const notNull = <T>(o: T | null): o is T => o !== null

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
  codes: string[]
  year: number
  searchMode: SearchMode
  limit: number
  offset: number
}

export async function searchCourseUseCase({
  year,
  timetable,
  keywords,
  codes,
  searchMode,
  offset,
  limit,
}: Input): Promise<Course[]> {
  const repo = getConnection().getRepository(Course)

  if (offset < 0)
    throw new InvalidArgumentError('offsetは0以上である必要があります')
  if (limit < 1)
    throw new InvalidArgumentError('limitは1以上である必要があります')

  // 時間の指定がある場合
  if (timetable) {
    const conditions = Object.keys(timetable) // 全てのmoduleについて
      .filter((module) => timetable[module as keyof typeof Module]) // 指定されてないとnullになるので排除
      .map((module) =>
        Object.keys(timetable[module as keyof typeof Module]!) // 全てのdayについて
          .filter((day) => {
            // 空配列or全てfalseの列は除外する
            const periods = timetable[module as keyof typeof Module]![
              day as keyof typeof Day
            ]
            return periods && periods.length > 0 && periods.includes(true)
          })
          .map((day) => {
            // 指定された時限だけが数値で入っている配列
            const periods = (timetable[module as keyof typeof Module]![
              day as keyof typeof Day
            ] as boolean[])
              .map((v, i) => (v ? i : null))
              .filter((v): v is number => v !== null)
            return {
              module: Module[module as keyof typeof Module],
              day: Day[day as keyof typeof Day],
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
          ${keywordCodeQuery(keywords, codes) /* and */}
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
        ${keywordCodeQuery(keywords, codes) /* and */}
        (
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
          .join(' and ')}
      )
      `

    const parameters: any = {
      names: searchNameRegexp(keywords),
      codes: searchCodeRegexp(codes),
      year,
    }
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

    // console.log(escapedQuery, escapedParameters)
    // 検索結果の講義id配列
    const ids = (await repo.query(escapedQuery, escapedParameters)).map(
      (r: any) => r.id
    )
    // 人力パースは大変なのでデータを取得するのはTypeORMに任せる
    return repo.findByIds(ids, {
      relations: ['schedules', 'methods', 'recommendedGrades'],
      order: {
        year: 'ASC',
        code: 'ASC',
      },
      skip: offset,
      take: limit,
    })
  } else {
    const conditions: FindOneOptions<Course>['where'] = { year }
    // FindOneOptionsにundefinedを割り当てるとsqlパラメータではnullとして解釈されるので必要なときだけプロパティを定義
    if (keywords.length > 0)
      conditions.name = Raw((alias) => `${alias} ~* :names`, {
        names: searchNameRegexp(keywords),
      })
    if (codes.length > 0)
      conditions.code = Raw((alias) => `${alias} ~* :codes`, {
        codes: searchCodeRegexp(codes),
      })

    return repo.find({
      relations: ['schedules', 'methods', 'recommendedGrades'],
      where: conditions,
      order: {
        year: 'ASC',
        code: 'ASC',
      },
      skip: offset,
      take: limit,
    })
  }
}
