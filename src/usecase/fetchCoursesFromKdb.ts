import parseKDB, { Course, downloadKDB } from 'twinte-parser'

/**
 * KDBから開講情報を取得
 * @param year 取得する年次
 */
export async function fetchCoursesFromKdbUseCase(
  year: number
): Promise<Course[]> {
  const xlsx = await downloadKDB(year)
  return parseKDB(xlsx)
}

export type fetchCoursesFromKdbUseCaseType = typeof fetchCoursesFromKdbUseCase
