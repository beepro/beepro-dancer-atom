'use babel'

import fs from 'fs-extra'
import _ from 'lodash'
import waggleDance from 'waggle-dance'

let members = {}
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

// XXX: style sheet handling is because of atom does not allow to apply style object onto 'line-number' type decoration.
//      See https://atom.io/docs/api/v1.30.0/TextEditor#instance-decorateMarker for more details
const stylesheet = document.createElement('style')
document.head.appendChild(stylesheet)

function getLeftMembers (currentMembers, latestMembers) {
  return _.difference(currentMembers, latestMembers)
}

function getNewMembers (currentMembers, latestMembers) {
  return _.difference(latestMembers, currentMembers)
}

export function membersDance (dance) {
  const currentMembers = Object.keys(members)
  const latestMembers = dance.members.map(member => member.id)

  getLeftMembers(currentMembers, latestMembers).map(member => {
    if (markers[member]) {
      markers[member].destroy()
      markers[member] = undefined
    }
    atom.notifications.addInfo(`${member} is left...`)
  })

  getNewMembers(currentMembers, latestMembers).map(member =>
    atom.notifications.addInfo(`${member} is joined!!!`)
  )

  members = {}
  stylesheet.innerHTML = dance.members
    .map(member => {
      members[member.id] = member
      return `.beepro-user-icon-${
        member.id
      } {background-image: url(${member.icon ||
        'https://avatars3.githubusercontent.com/u/35159500?s=200&v=4'})}\n`
    })
    .join('')
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
    // CAUTION: Manipulating user icon should be executed after buffer saved otherwise the icon will be removed.
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
