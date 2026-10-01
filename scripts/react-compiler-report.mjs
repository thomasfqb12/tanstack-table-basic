/**
 * Lists what the React Compiler does with each component/hook.
 * Exits 1 if any function failed to compile (the compiler would silently
 * skip it at build time).
 *
 * Usage: pnpm compiler:report [dir ...]   (default: src)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { transformAsync } from '@babel/core'
import reactCompiler from 'babel-plugin-react-compiler'

const root = process.cwd()
const dirs = process.argv.slice(2).length ? process.argv.slice(2) : ['src']

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) yield* walk(path)
    else if (/\.tsx?$/.test(entry) && !/\.(d|gen)\.ts$/.test(entry)) yield path
  }
}

let failures = 0
for (const file of dirs.flatMap((dir) => [...walk(join(root, dir))])) {
  const events = []
  await transformAsync(readFileSync(file, 'utf8'), {
    filename: file,
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: ['typescript', 'jsx'] },
    plugins: [
      [
        reactCompiler,
        {
          panicThreshold: 'none',
          logger: { logEvent: (_filename, event) => events.push(event) },
        },
      ],
    ],
  })
  for (const event of events) {
    const where = `${relative(root, file)} ${event.fnName ?? ''}`.trim()
    if (event.kind === 'CompileSuccess') console.log(`  ok    ${where}`)
    if (event.kind === 'CompileError') {
      failures++
      const reason = event.detail?.reason ?? event.detail?.options?.reason
      const line = event.detail?.loc?.start?.line ?? event.fnLoc?.start?.line
      console.log(`  FAIL  ${where}${line ? `:${line}` : ''}  ${reason}`)
    }
  }
}
console.log(
  failures ? `\n${failures} function(s) not compiled` : '\nall compiled',
)
process.exit(failures ? 1 : 0)
