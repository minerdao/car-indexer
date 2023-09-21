import { access, constants, opendir, readFile, stat } from 'fs/promises'
import path from 'path'
import { createReadStream } from 'fs'
import { Readable } from 'stream'
import { FileEntry } from '../types.ts'

let ignored: string[] = []

export async function* walk(dir: string): any {
  if (!ignored.length) {
    try {
      ignored = (await readFile('.gitignore')).toString().split('\n')
    } catch {}
  }
  for await (const d of await opendir(dir)) {
    if (!ignored.includes(d.name)) {
      const entry = path.join(dir, d.name)
      if (d.isDirectory()) yield* walk(entry)
      else if (d.isFile() && !d.name.startsWith('.')) yield entry
    }
  }
}

export function fileSize(bytes: number, si = true, dp = 1): string {
  const thresh = si ? 1000 : 1024

  if (Math.abs(bytes) < thresh) {
    return bytes + 'B'
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
  let u = -1
  const r = 10 ** dp

  do {
    bytes /= thresh
    ++u
  } while (
    Math.round(Math.abs(bytes) * r) / r >= thresh &&
    u < units.length - 1
  )

  return bytes.toFixed(dp) + units[u]
}

/**
 * @param {string} file
 * @returns
 */
export const exists = async (file: string) => {
  try {
    await access(file, constants.F_OK)
    return true
  } catch {
    return false
  }
}

export const dirData = async (dir: string) => {
  let total = 0
  const files: FileEntry[] = []
  for await (const path of walk(dir)) {
    const size = (await stat(path)).size
    total += size
    files.push({
      name: dir === '.' ? path : path.replace(dir, ''),
      size,
      stream: () => Readable.toWeb(createReadStream(path)) as ReadableStream,
    })
  }
  return [total, files] as const
}

/**
 * @param {string} file
 * @returns string
 */
export const readTextFile = async (file: string) =>
  (await readFile(file)).toString()