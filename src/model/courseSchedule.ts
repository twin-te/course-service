import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Course } from './course'
import { Module, Day } from './enums'

@Entity({
  name: 'course_schedules',
})
export class CourseSchedule {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => Course, (r) => r.schedules)
  couseId!: string

  @Column({
    name: 'module',
    type: 'smallint',
  })
  module!: Module

  @Column({
    name: 'day',
    type: 'smallint',
  })
  day!: Day

  @Column({
    name: 'period',
    type: 'smallint',
  })
  period!: number

  @Column({
    name: 'room',
    type: 'text',
  })
  room!: string
}
