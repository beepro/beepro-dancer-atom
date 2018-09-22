'use babel'

import fs from 'fs-extra'
import waggleDance from 'waggle-dance'

const members = {}
const markers = {}

function displayUserIconMarker ({ dance, editor }) {
  if (markers[dance.who]) {
    markers[dance.who].destroy()
  }
  const marker = editor.markBufferRange([
    [dance.change.from.row, dance.change.from.col],
    [dance.change.from.row, dance.change.from.col]
  ])
  const decoration = editor.decorateMarker(marker, {
    type: 'line-number',
    class: `beepro-user-icon beepro-user-icon-${dance.who}`
  })
  markers[dance.who] = marker
}

export function membersDance (dance) {
  const stylesheet = document.createElement('style')

  stylesheet.innerHTML = dance.members.map(member => {
    members[member.id] = member
    return `.beepro-user-icon-${
      member.id
    } {background-image: url(${member.icon ||
      'https://avatars3.githubusercontent.com/u/35159500?s=200&v=4'})}\n`
  })
  document.head.appendChild(stylesheet)
}

// TODO verification for several cases
export function changeDance (dance, { buffer, editor, path }) {
  console.log('change dance', dance)
  if (dance.path === path) {
    let newText = waggleDance.apply(buffer.getText(), dance.change)
    const position = editor.getCursorScreenPosition()
    buffer.setText(newText)
    editor.setCursorScreenPosition(position)
    buffer.save()
    displayUserIconMarker({ dance, editor })
    return true
  } else {
    const absolutePath = `${atom.project.getPaths()[0]}/${dance.path}`
    const file = fs.readFileSync(absolutePath)
    let newText = waggleDance.apply(file.toString(), dance.change)
    fs.writeFileSync(absolutePath, newText)
    return false
  }
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
