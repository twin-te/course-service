import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Course } from './course'
import { CourseMethod as CourseMethodEnum } from './enums'

@Entity({
  name: 'course_methods',
})
export class CourseMethod {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => Course, (r) => r.methods)
  @JoinColumn({ name: 'course_id' })
  courseId!: string

  @Column({
    name: 'method',
    type: 'enum',
    enum: CourseMethodEnum,
  })
  method!: CourseMethodEnum
}
