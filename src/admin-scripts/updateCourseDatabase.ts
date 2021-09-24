import { NoCoursesFoundError } from 'twinte-parser'
import { connectDatabase } from '../database'
import { logger } from '../logger'
import { fetchCoursesFromKdbUseCase } from '../usecase/fetchCoursesFromKdb'
import { updateCourseDatabaseUseCase } from '../usecase/updateCourseDatabase'

// 3月以降は次の年度の更新をする
const nendo =
  new Date().getMonth() < 2
    ? new Date().getFullYear() - 1
    : new Date().getFullYear()

/**
 * データベース更新用スクリプト
 */
const main = async () => {
  logger.info('script is starting.')
  await connectDatabase()
  const year =
    process.argv[2] && !isNaN(parseInt(process.argv[2]))
      ? parseInt(process.argv[2])
      : nendo
  logger.info(`target year: ${year}`)
  try {
    const courses = await fetchCoursesFromKdbUseCase(year)
    const updateResult = await updateCourseDatabaseUseCase(year, courses)
    logger.info(updateResult)
    logger.info('done')
  } catch (e) {
    if (e instanceof NoCoursesFoundError) {
      logger.info('Search results are empty')
    } else {
      throw e
    }
  }
}

process.on('uncaughtException', (err) => {
  logger.fatal('uncaughtException\n', err)
})

process.on('unhandledRejection', (reason, p) => {
  logger.fatal('unhandledRejection\n', p, reason)
})

main()
