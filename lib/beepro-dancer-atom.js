'use babel'

import git from 'git-promise'
import fs from 'fs-extra'
import jschardet from 'jschardet'
import model from './model'
import BeeproDancerAtomView from './beepro-dancer-atom-view'
import { CompositeDisposable } from 'atom'
import { createHoney, uploadFile } from './api.js'
import {
  addDanceQue,
  dance,
  deleteDance,
  changedByMe,
  deleteByMe,
  createByMe,
  moveByMe
} from './dance.js'

let locked = true

export default {
  beeproDancerAtomView: null,
  modalPanel: null,
  subscriptions: null,
  changeFile: null,
  activeEditor: null,
  addedEditor: null,
  changeBuffer: null,
  socket: null,

  send (json) {
    if (this.socket) {
      console.log('# send', json)
      this.socket.send(JSON.stringify(json))
    }
  },

  activate (state) {
    this.beeproDancerAtomView = new BeeproDancerAtomView(
      state.beeproDancerAtomViewState
    )
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.beeproDancerAtomView.getElement(),
      visible: false
    })

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable()

    // Register command that toggles this view
    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        'beepro-dancer-atom:toggle': () => this.toggle(),
        'beepro-dancer-atom:notify': () => this.activateBeePro(),
        'beepro-dancer-atom:deactivate': () => this.deactivateBeePro()
      })
    )
  },

  serialize () {
    return { beeproDancerAtomViewState: this.beeproDancerAtomView.serialize() }
  },

  toggle () {
    console.log('BeeproDancerAtom was toggled!')
    return this.modalPanel.isVisible()
      ? this.modalPanel.hide()
      : this.modalPanel.show()
  },

  activateBeePro () {
    this.changeFile = atom.project.onDidChangeFiles(events => {
      for (const event of events) {
        // For Ctrl + N case
        if (event.path == null) {
          continue
        }

        // TODO need to fetch .gitignore files.
        const check = event.path
          .replace(atom.project.getPaths()[0], '')
          .replace(/^\//g, '')
        if (check.startsWith('.git') || check.startsWith('node_modules')) {
          continue
        }

        console.log('event', event)
        // "created", "modified", "deleted", or "renamed"
        console.log(`Event action: ${event.action}`)

        if (event.action === 'created') {
          // TODO consider when the empty file is created.
          let isTextFile = this.isTextFile(event.path)
          isTextFile ? this.createFile(event.path.replace(atom.project.getPaths()[0], '').replace(/^\//g, ''))
            : uploadFile(event.path)
        } else if (event.action === 'deleted') {
          console.log('file is deleted')
          this.deleteFile(event.path.replace.replace(atom.project.getPaths()[0], '').replace(/^\//g, ''))
        } else if (event.action === 'renamed') {
          console.log('file is renamed')
          this.moveFile(event.oldPath.replace(atom.project.getPaths()[0], '').replace(/^\//g, '')
            , event.path.replace(atom.project.getPaths()[0], '').replace(/^\//g, ''))
          console.log(`.. renamed from: ${event.oldPath}`)
        } else if (event.action === 'modified') {
        }
      }
    })
    this.activeEditor = atom.workspace.onDidChangeActiveTextEditor(() => this.registerActiveText())
    this.addedEditor = atom.workspace.onDidAddTextEditor(({ textEditor }) =>
      this.createNewTextFile(textEditor)
    )

    this.registerActiveText()
    createHoney().then(url => this.startWebsocket(url))
    dance()
  },

  deactivateBeePro () {
    this.socket.close()
    clearInterval(interval)
    this.changeFile.dispose()
    this.activeEditor.dispose()
    this.addedEditor.dispose()
    this.changeBuffer.dispose()
    this.modalPanel.destroy()
    this.subscriptions.dispose()
    this.beeproDancerAtomView.destroy()
    atom.notifications.addInfo('deactivate beepro')
  },

  isTextFile (absolutePath) {
    const file = fs.readFileSync(absolutePath)

    // TODO verify
    // Empty file is defined as test file at once.
    if (!file.toString() || file.toString() == null) {
      return true
    }

    console.log(
      'jschardet.detect(file).encoding',
      jschardet.detect(file).encoding
    )
    if (jschardet.detect(file).encoding == null) {
      return false
    } else {
      return true
    }
  },

  eventCheck () {
    atom.notifications.addInfo('callback is executed')
  },

  registerActiveText () {
    let editor = atom.workspace.getActiveTextEditor()
    // For binary file case
    if (editor != null) {
      // For commend + N case
      if (editor.getPath() != null) {
        let path = editor.getPath().replace(atom.project.getPaths()[0], '').replace(/^\//g, '')
        this.changeBuffer = editor.getBuffer().onDidChange(({changes}) => this.assignment(changes, path))
      }
    }
  },

  createFile (path) {
    if (locked) {
      console.log('ignore dance')
      return
    }
    this.eventCheck()
    if (
      createByMe({
        ...model.create,
        path
      })
    ) {
      this.send({
        ...model.create,
        path
      })
      console.log('send createText')
    }
  },

  deleteFile (path) {
    if (locked) {
      console.log('ignore dance')
      return
    }
    this.eventCheck()
    if (deleteByMe(path)) {
      this.send({
        ...model.delete,
        path
      })
      console.log('send deleteText')
    }
  },

  moveFile (oldPath, newPath) {
    if (locked) {
      console.log('ignore dance')
      return
    }
    if (moveByMe({
      ...model.move,
      path: oldPath,
      to: newPath
    })) {
      this.send({
        ...model.move,
        path: oldPath,
        to: newPath
      })
      console.log('send moveText')
    }
  },

  createNewTextFile (textEditor) {
    if (textEditor.getPath() != null) {
      const path = textEditor.getPath().replace(atom.project.getPaths()[0], '').replace(/^\//g, '')
      textEditor.getBuffer().onDidChange(({changes}) => this.assignment(changes, path))
    }
  },

  assignment (textBuffer, path) {
    if (locked) {
      console.log('ignore dance')
      return
    }
    console.log('textBuffer', textBuffer)
    const buffer = textBuffer[0]
    if (changedByMe({
      ...model.change,
      path,
      change: {
        text: buffer.newText,
        from: {
          row: buffer.oldRange.start.row,
          col: buffer.oldRange.start.column
        },
        to: {
          row: buffer.oldRange.end.row,
          col: buffer.oldRange.end.column
        }
      }
    })) {
      // send(socket, moveText);
      this.send({
        ...model.change,
        path,
        change: {
          text: buffer.newText,
          from: {
            row: buffer.oldRange.start.row,
            col: buffer.oldRange.start.column
          },
          to: {
            row: buffer.oldRange.end.row,
            col: buffer.oldRange.end.column
          }
        }
      })
    }
    atom.workspace.getActiveTextEditor().save()
  },

  startWebsocket (url) {
    console.log('url', url)
    this.socket = new WebSocket(url)

    /* eslint no-unused-vars: "error", no-undef: "error" */
    /* global interval: true */
    interval = setInterval(() => {
      this.socket.send('KEEPALIVE')
    }, 5000)

    this.socket.onmessage = msg => {
      console.log('socket', JSON.parse(msg.data))
      const TYPE = JSON.parse(msg.data).type
      if (TYPE === 'sync') {
        this.activateReposiroty()
      } else if (TYPE === 'change') {
        addDanceQue(JSON.parse(msg.data))
        // changeDance(JSON.parse(msg.data));
      } else if (TYPE === 'delete') {
        deleteDance(JSON.parse(msg.data))
      }
    }
  },

  joinBeepro (id) {
    this.send({
      ...model.join,
      user: {
        id
      }
    })
    this.send(model.resume)
  },

  activateReposiroty () {
    let path = atom.project.getPaths()[0]
    let branch = atom.project.getRepositories()[0].branch
    locked = true
    // TODO until resume has been finished, atom should be locked.
    return git(`fetch origin ${branch}`, { cwd: path })
      .then(() => git(`reset --hard HEAD`, { cwd: path }))
      .then(() => git(`pull origin ${branch}`, { cwd: path }))
      .then(() => git(`config --get-all user.name`, { cwd: path }))
      .then(id => {
        setTimeout(() => {
          locked = false
          atom.notifications.addInfo('Ready to beepro!!!')
          this.joinBeepro(id.replace(/\n/g, ''))
        }, 3000)
      })
  }
}
