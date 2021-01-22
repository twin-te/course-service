import { NoCoursesFoundError } from 'twinte-parser/dist/kdbDownloader'
import { fetchCoursesFromKdbUseCase } from '../../src/usecase/fetchCoursesFromKdb'

test('存在しない年次を指定したときにエラーになる', async () => {
  await expect(fetchCoursesFromKdbUseCase(9999)).rejects.toBeInstanceOf(
    NoCoursesFoundError
  )
})

test(
  '存在する年次を指定したときに何かしらのデータが帰ってくる',
  async () => {
    const courses = await fetchCoursesFromKdbUseCase(2020)
    expect(courses.length).not.toBe([])
  },
  1000 * 60 * 10
)
