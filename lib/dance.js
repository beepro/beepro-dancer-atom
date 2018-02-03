'use babel'

import fs from 'fs-extra'
import waggleDance from 'waggle-dance'

/* eslint no-undef: "error", no-unused-vars: "error", no-global-assign: "error" */
/* global createStock:true, moveStock:true, deleteStock:true, changeStock:true, dances:true */
createStock = []
moveStock = []
deleteStock = []
changeStock = []
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
  changeStock.push(dance.change)
  console.log('changeStock was pushed', changeStock)
  fs.writeFileSync(absolutePath, newText)
}

export function deleteDance (dance) {
  const absolutePath = `${atom.project.getPaths()[0]}/${dance.path}`
  deleteStock.push(dance.path)
  fs.removeSync(absolutePath)
  console.log('end deleteDance')
}

export function createDance (dance) {
  const absolutePath = `${atom.project.getPaths()[0]}/${dance.path}`
  createStock.push(dance)
  fs.outputFileSync(absolutePath, dance.contents, 'utf8')
  console.log('end createDance')
}

export function moveDance (dance) {
  const absolutePath = `${atom.project.getPaths()[0]}/${dance.path}`
  const destinationPath = `${atom.project.getPaths()[0]}/${dance.to}`
  moveStock.push(dance)
  fs.moveSync(absolutePath, destinationPath)
  console.log('end moveDance')
}

export function changedByMe (changeText) {
  const changeJSON = JSON.stringify(changeText.change)
  let matched = true
  console.log('origin changeStock', changeStock)
  changeStock.some(function (v, i) {
    if (JSON.stringify(v) === changeJSON) {
      changeStock.splice(i, 1)
      console.log('spliced', changeStock)
      matched = false
    }
  })
  if (matched) {
    console.log('unmatched')
    console.log('changeText', changeText)
    console.log('changeStock', changeStock)
  }
  return matched
}

export function deleteByMe (path) {
  let matched = true
  deleteStock.some(function (v, i) {
    if (v === path) {
      deleteStock.splice(i, 1)
      console.log('matched', deleteStock)
      matched = false
    }
  })
  return matched
}

export function createByMe (text) {
  // TODO
  return true
  // let matched = true
  // createStock.some(function (v, i) {
  //   if (text.path === v.path && text.contents === v.contents) {
  //     createStock.splice(i, 1)
  //     console.log('matched', createStock)
  //     matched = false
  //   }
  // })
  // return matched
}

export function moveByMe (text) {
  let matched = true
  moveStock.some(function (v, i) {
    if (text.path === v.path && text.to === v.to) {
      moveStock.splice(i, 1)
      console.log('matched', moveStock)
      matched = false
    }
  })
  return matched
}
