import { createDBDay, createDBModule } from '../../src/grpc/converter'
import { Module as PModule, Day as PDay } from 'twinte-parser'
import { Module, Day } from '../../src/database/model/enums'

describe('ModuleConverter', () => {
  test('SpringA', () => {
    expect(createDBModule(PModule.SpringA)).toBe(Module.SpringA)
  })
  test('SpringB', () => {
    expect(createDBModule(PModule.SpringB)).toBe(Module.SpringB)
  })
  test('SpringC', () => {
    expect(createDBModule(PModule.SpringC)).toBe(Module.SpringC)
  })
  test('FallA', () => {
    expect(createDBModule(PModule.FallA)).toBe(Module.FallA)
  })
  test('FallB', () => {
    expect(createDBModule(PModule.FallB)).toBe(Module.FallB)
  })
  test('FallC', () => {
    expect(createDBModule(PModule.FallC)).toBe(Module.FallC)
  })
  test('SummerVacation', () => {
    expect(createDBModule(PModule.SummerVacation)).toBe(Module.SummerVacation)
  })
  test('SpringVacation', () => {
    expect(createDBModule(PModule.SpringVacation)).toBe(Module.SpringVacation)
  })
  test('Annual', () => {
    expect(createDBModule(PModule.Annual)).toBe(Module.Annual)
  })
  test('Unknown', () => {
    expect(createDBModule(PModule.Unknown)).toBe(Module.Unknown)
  })
  test('unexpected data', () => {
    expect(createDBModule('unexpected data' as PModule)).toBe(Module.Unknown)
  })
})

describe('DayConverter', () => {
  test('Sun', () => expect(createDBDay(PDay.Sun)).toBe(Day.Sun))
  test('Mon', () => expect(createDBDay(PDay.Mon)).toBe(Day.Mon))
  test('Tue', () => expect(createDBDay(PDay.Tue)).toBe(Day.Tue))
  test('Wed', () => expect(createDBDay(PDay.Wed)).toBe(Day.Wed))
  test('Thu', () => expect(createDBDay(PDay.Thu)).toBe(Day.Thu))
  test('Fri', () => expect(createDBDay(PDay.Fri)).toBe(Day.Fri))
  test('Sat', () => expect(createDBDay(PDay.Sat)).toBe(Day.Sat))
  test('Intensive', () =>
    expect(createDBDay(PDay.Intensive)).toBe(Day.Intensive))
  test('Appointment', () =>
    expect(createDBDay(PDay.Appointment)).toBe(Day.Appointment))
  test('AnyTime', () => expect(createDBDay(PDay.AnyTime)).toBe(Day.AnyTime))
  test('Unknown', () => expect(createDBDay(PDay.Unknown)).toBe(Day.Unknown))
  test('unexpected data', () =>
    expect(createDBDay('unexpected data' as PDay)).toBe(Day.Unknown))
})
