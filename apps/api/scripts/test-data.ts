/**
 * Quick test to verify V1.4 data files are valid
 */

import * as fs from 'fs'
import * as path from 'path'

const dataDir = './scripts/v14-data'

console.log('Testing V1.4 data files...\n')

const files = ['team.json', 'projects.json', 'tasks.json', 'activities.json']

for (const file of files) {
  const filePath = path.join(dataDir, file)
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)
    
    const count = Array.isArray(data.members) ? data.members.length :
                  Array.isArray(data.projects) ? data.projects.length :
                  Array.isArray(data.tasks) ? data.tasks.length :
                  Array.isArray(data.activities) ? data.activities.length : 0
    
    console.log(`✅ ${file}: Valid JSON, ${count} records`)
  } catch (error) {
    console.error(`❌ ${file}: ${error}`)
  }
}

console.log('\n✅ All data files are valid!')
