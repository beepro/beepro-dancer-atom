'use babel'

import fs from 'fs-extra'
import waggleDance from 'waggle-dance'

export function addDanceQue (dance) {
  changeDance(dance)
}

// TODO verification for several cases
export function changeDance (dance) {
  const absolutePath = `${atom.project.getPaths()[0]}/${dance.path}`
  const file = fs.readFileSync(absolutePath)
  let newText = waggleDance.apply(file.toString(), dance.change)
  console.log('changeStock was pushed', this.changeStock)
  fs.writeFileSync(absolutePath, newText)
}

export function deleteDance (dance) {
  const absolutePath = `${atom.project.getPaths()[0]}/${dance.path}`
  fs.removeSync(absolutePath)
  console.log('end deleteDance')
}

export function createDance (dance) {
  const absolutePath = `${atom.project.getPaths()[0]}/${dance.path}`
  fs.outputFileSync(absolutePath, dance.contents, 'utf8')
  console.log('end createDance')
}

export function moveDance (dance) {
  const absolutePath = `${atom.project.getPaths()[0]}/${dance.path}`
  const destinationPath = `${atom.project.getPaths()[0]}/${dance.to}`
  fs.moveSync(absolutePath, destinationPath)
  console.log('end moveDance')
}

export function changedByMe (changeText) {
  const changeJSON = JSON.stringify(changeText.change)
  let matched = true
  console.log('origin changeStock', this.changeStock)
  this.changeStock.some(function (v, i) {
    if (JSON.stringify(v) === changeJSON) {
      this.changeStock.splice(i, 1)
      console.log('spliced', this.changeStock)
      matched = false
    }
  })
  if (matched) {
    console.log('unmatched')
    console.log('changeText', changeText)
    console.log('changeStock', this.changeStock)
  }
  return matched
}
