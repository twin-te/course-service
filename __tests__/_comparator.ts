import { Course } from '../src/model/course'

export function compareCourseWithoutId(
  a: Course,
  { recommendedGrades, schedules, id, methods, ...b }: Course
) {
  expect(a).toEqual(expect.objectContaining(b))
  expect(a.methods.map((m) => m.method)).toEqual(
    expect.arrayContaining(methods.map((m) => m.method))
  )
  expect(a.recommendedGrades.map(({ id, ...g }) => g)).toEqual(
    expect.arrayContaining(recommendedGrades.map(({ id, ...g }) => g))
  )
  expect(a.schedules.map(({ id, ...s }) => s)).toEqual(
    expect.arrayContaining(schedules.map(({ id, ...s }) => s))
  )
}
