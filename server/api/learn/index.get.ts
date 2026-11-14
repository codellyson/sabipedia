import { environment } from '../../utils/auth'
export default defineEventHandler(async event => {
 const rows = await environment(event).DB.prepare(`SELECT l.language,COUNT(*) pages,SUM(json_array_length(v.content,'$.phrases')) phrases
  FROM lesson l JOIN lesson_version v ON v.id=l.current_version_id GROUP BY l.language`).all<{ language: string; pages: number; phrases: number }>()
 return rows.results
})
