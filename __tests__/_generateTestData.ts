import parseKDB, { Course, downloadKDB } from 'twinte-parser'
import fs from 'fs'
import path from 'path'

const generate = async (count: number) => {
  const xlsx = await downloadKDB(2020)
  const courses = parseKDB(xlsx)
  const testdata: Course[] = []
  for (let i = 0; i < count; i++) {
    const r = Math.floor(Math.random() * courses.length)
    testdata.push(courses[r])
    courses.splice(r, 1)
  }
  fs.writeFileSync(
    path.resolve(__dirname, './testdata.json'),
    JSON.stringify(testdata)
  )
}

generate(500)
