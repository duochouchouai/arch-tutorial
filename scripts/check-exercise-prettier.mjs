/**
 * @file 校验 exercise 下各项目的 .prettierrc 是否与根配置一致
 * @author 教程组
 *
 * 根目录的 Prettier 配置是唯一标准。成员项目为了独立运行 npm run gate，
 * 需要保留自己的 .prettierrc；其内容必须与根配置相同，否则本地门禁与
 * 提交钩子的格式化结果会不一致。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const exerciseDir = join(root, 'exercise')
const canonical = JSON.parse(readFileSync(join(root, '.prettierrc'), 'utf8'))
const canonicalKeys = new Set(Object.keys(canonical))

const ignoredDirectories = new Set(['node_modules', 'dist', 'coverage', '.git'])

function findConfigs(directory) {
  const configs = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        configs.push(...findConfigs(join(directory, entry.name)))
      }
      continue
    }
    if (entry.name === '.prettierrc') {
      configs.push(join(directory, entry.name))
    }
  }
  return configs
}

const configs = findConfigs(exerciseDir).sort()
const failures = []
for (const path of configs) {
  const relativePath = relative(exerciseDir, path)
  const label = ['exercise', ...relativePath.split(sep)].join('/')
  let actual
  try {
    actual = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    failures.push(`${label}：无法解析（${error.message}）`)
    continue
  }

  const allKeys = new Set([...canonicalKeys, ...Object.keys(actual)])
  const differences = [...allKeys].filter((key) => actual[key] !== canonical[key])
  if (differences.length > 0) {
    failures.push(
      [
        `${label} 与根配置不一致：${differences.join('、')}`,
        `  期望：${JSON.stringify(canonical)}`,
        `  实际：${JSON.stringify(actual)}`,
      ].join('\n'),
    )
  }
}

if (failures.length > 0) {
  console.error('\n✗ Prettier 配置检查未通过：\n')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  console.error('\n请将根目录 .prettierrc 的内容复制到对应项目后重新提交。')
  process.exit(1)
}

console.log(`✓ Prettier 配置一致（检查 ${configs.length} 个文件）`)
