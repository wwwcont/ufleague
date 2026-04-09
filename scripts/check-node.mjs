#!/usr/bin/env node

const minimum = [20, 19, 0]
const current = process.versions.node
  .split('.')
  .map((part) => Number.parseInt(part, 10))

const compareVersions = (left, right) => {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] > right[index]) return 1
    if (left[index] < right[index]) return -1
  }
  return 0
}

if (compareVersions(current, minimum) < 0) {
  console.error(
    `\n❌ Node.js ${process.versions.node} detected. This project requires Node.js 20.19.0 or newer (or 22.12.0+).\n` +
      'Use nvm:\n' +
      '  nvm install 22\n' +
      '  nvm use 22\n'
  )
  process.exit(1)
}
