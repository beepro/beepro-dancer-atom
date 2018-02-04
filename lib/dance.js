'use babel'

import fs from 'fs-extra'
import waggleDance from 'waggle-dance'

/* eslint no-undef: "error", no-unused-vars: "error", no-global-assign: "error" */
/* global dances:true */
dances = []

export function addDanceQue (dance) {
  dances.push(dance)
}

export function dance () {
  // Keep alive
  interval = setInterval(() => {
    if (dances.length > 0) {
      changeDance(dances.shift())
    }
  }, 1000)
}

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
