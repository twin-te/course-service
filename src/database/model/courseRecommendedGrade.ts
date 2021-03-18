import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Course } from './course'

@Entity({
  name: 'course_recommended_grades',
})
export class CourseRecommendedGrade {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => Course, (r) => r.recommendedGrades)
  @JoinColumn({ name: 'course_id' })
  courseId!: string

  @Column({
    name: 'grade',
    type: 'smallint',
  })
  grade!: number
}
