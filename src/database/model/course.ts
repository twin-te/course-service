import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { CourseRecommendedGrade } from './courseRecommendedGrade'
import { CourseMethod } from './courseMethod'
import { CourseSchedule } from './courseSchedule'

@Entity({
  name: 'courses',
})
@Index(['year', 'code'], { unique: true })
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({
    name: 'year',
    type: 'smallint',
  })
  year!: number

  @Column({
    name: 'code',
    type: 'text',
  })
  code!: string

  @Column({
    name: 'name',
    type: 'text',
  })
  name!: string

  @Column({
    name: 'instructor',
    type: 'text',
  })
  instructor!: string

  @Column({
    name: 'credit',
    type: 'numeric',
    transformer: {
      from: (v: string) => Number(v),
      to: (v) => v,
    },
  })
  credit!: number

  @Column({
    name: 'overview',
    type: 'text',
  })
  overview!: string

  @Column({
    name: 'remarks',
    type: 'text',
  })
  remarks!: string

  @Column({
    name: 'last_update',
    type: 'timestamptz',
  })
  lastUpdate!: Date

  @Column({
    name: 'has_parse_error',
    type: 'bool',
  })
  hasParseError!: boolean

  @OneToMany(() => CourseRecommendedGrade, (r) => r.courseId, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  recommendedGrades!: CourseRecommendedGrade[]

  @OneToMany(() => CourseMethod, (r) => r.courseId, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  methods!: CourseMethod[]

  @OneToMany(() => CourseSchedule, (r) => r.courseId, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  schedules!: CourseSchedule[]
}
