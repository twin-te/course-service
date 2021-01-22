import { Course as ParsedCourse } from 'twinte-parser'
import fs from 'fs'
import path from 'path'

export function loadTestData() {
  return JSON.parse(
    fs.readFileSync(path.resolve(__dirname, './testdata.json'), 'utf-8')
  ).map((c: any) => ({
    ...c,
    lastUpdate: new Date(c.lastUpdate),
  })) as ParsedCourse[]
}
