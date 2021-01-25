import parseKDB, { Course, downloadKDB } from 'twinte-parser'
import { logger } from '../logger'

/**
 * KDBから開講情報を取得
 * @param year 取得する年次
 */
export async function fetchCoursesFromKdbUseCase(
  year: number
): Promise<Course[]> {
  logger.info('fetching data from kdb.')
  const xlsx = await downloadKDB(year)
  return parseKDB(xlsx)
}

export type fetchCoursesFromKdbUseCaseType = typeof fetchCoursesFromKdbUseCase
