'use babel'

import fs from 'fs-extra'
import waggleDance from 'waggle-dance'

// TODO verification for several cases
export function changeDance (dance) {
  const absolutePath = `${atom.project.getPaths()[0]}/${dance.path}`
  const file = fs.readFileSync(absolutePath)
  let newText = waggleDance.apply(file.toString(), dance.change)
  fs.writeFileSync(absolutePath, newText)
}

export function deleteDance (dance) {
  const absolutePath = `${atom.project.getPaths()[0]}/${dance.path}`
  fs.removeSync(absolutePath)
}

export function createDance (dance) {
  const absolutePath = `${atom.project.getPaths()[0]}/${dance.path}`
  fs.outputFileSync(absolutePath, dance.contents, 'utf8')
}

export function moveDance (dance) {
  const absolutePath = `${atom.project.getPaths()[0]}/${dance.path}`
  const destinationPath = `${atom.project.getPaths()[0]}/${dance.to}`
  fs.moveSync(absolutePath, destinationPath)
}
