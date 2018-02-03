'use babel'

import git from 'git-promise'
import fs from 'fs-extra'
import jschardet from 'jschardet'
import model from './model'
import BeeproDancerAtomView from './beepro-dancer-atom-view'
import { CompositeDisposable } from 'atom'
import { createHoney, uploadFile } from './api'
import { changeDance, createDance, deleteDance } from './dance'

export default {
  locked: false,
  syncing: false,
  socket: null,
  beeproDancerAtomView: null,
  modalPanel: null,
  subscriptions: null,

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
        'beepro-dancer-atom:notify': () => this.activateBeePro()
      })
    )
  },

  deactivate () {
    this.modalPanel.destroy()
    this.subscriptions.dispose()
    this.beeproDancerAtomView.destroy()
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
    atom.project.onDidChangeFiles(events => {
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

        if (event.action === 'created') {
          // TODO consider when the empty file is created.
          let isTextFile = this.isTextFile(event.path)
          isTextFile
            ? this.createFile(
              event.path
                .replace(atom.project.getPaths()[0], '')
                .replace(/^\//g, '')
            )
            : uploadFile(event.path)
        } else if (event.action === 'deleted') {
          this.deleteFile(
            event.path.replace
              .replace(atom.project.getPaths()[0], '')
              .replace(/^\//g, '')
          )
        } else if (event.action === 'renamed') {
          this.moveFile(
            event.oldPath
              .replace(atom.project.getPaths()[0], '')
              .replace(/^\//g, ''),
            event.path
              .replace(atom.project.getPaths()[0], '')
              .replace(/^\//g, '')
          )
        } else if (event.action === 'modified') {
        }
      }
    })

    atom.workspace.onDidChangeActiveTextEditor(() => this.registerActiveText())
    atom.workspace.onDidAddTextEditor(({ textEditor }) =>
      this.createNewTextFile(textEditor)
    )

    this.registerActiveText()
    createHoney().then(url => this.startWebsocket(url))
  },

  isTextFile (absolutePath) {
    const file = fs.readFileSync(absolutePath)

    // TODO verify
    // Empty file is defined as test file at once.
    if (!file.toString() || file.toString() == null) {
      console.log('file.toString()', file.toString())
      console.log('empty')
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
        let path = editor
          .getPath()
          .replace(atom.project.getPaths()[0], '')
          .replace(/^\//g, '')
        editor
          .getBuffer()
          .onDidChange(({ changes }) => this.assignment(changes, path))
      }
    }
  },

  createFile (path) {
    if (this.syncing || this.locked) {
      console.log('ignore dance: create')
      this.locked = false
      return
    }
    this.eventCheck()
    this.send({
      ...model.create,
      path
    })
  },

  deleteFile (path) {
    if (this.syncing || this.locked) {
      console.log('ignore dance: delete')
      this.locked = false
      return
    }
    this.eventCheck()
    this.send({
      ...model.delete,
      path
    })
  },

  moveFile (oldPath, newPath) {
    if (this.syncing || this.locked) {
      console.log('ignore dance: move')
      this.locked = false
      return
    }
    this.send({
      ...model.move,
      path: oldPath,
      to: newPath
    })
  },

  createNewTextFile (textEditor) {
    if (textEditor.getPath() != null) {
      const path = textEditor
        .getPath()
        .replace(atom.project.getPaths()[0], '')
        .replace(/^\//g, '')
      textEditor
        .getBuffer()
        .onDidChange(({ changes }) => this.assignment(changes, path))
    }
  },

  assignment (textBuffer, path) {
    if (this.syncing || this.locked) {
      console.log('ignore dance: change')
      this.locked = false
      return
    }
    console.log('textBuffer', textBuffer)
    const buffer = textBuffer[0]
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
    atom.workspace.getActiveTextEditor().save()
  },

  startWebsocket (url) {
    console.log('url', url)
    this.socket = new WebSocket(url)

    // Keep alive
    setInterval(() => {
      this.socket.send('KEEPALIVE')
    }, 5000)

    this.socket.onmessage = msg => {
      console.log('# onmessage', JSON.parse(msg.data))
      const TYPE = JSON.parse(msg.data).type
      this.locked = true
      if (TYPE === 'sync') {
        this.activateReposiroty()
      } else if (TYPE === 'change') {
        changeDance(JSON.parse(msg.data))
        // changeDance(JSON.parse(msg.data));
      } else if (TYPE === 'delete') {
        deleteDance(JSON.parse(msg.data))
      } else if (TYPE === 'create') {
        createDance(JSON.parse(msg.data))
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
    this.syncing = true
    // TODO until resume has been finished, atom should be locked.
    return git(`fetch origin ${branch}`, { cwd: path })
      .then(() => git(`reset --hard HEAD`, { cwd: path }))
      .then(() => git(`pull origin ${branch}`, { cwd: path }))
      .then(() => git(`config --get-all user.name`, { cwd: path }))
      .then(id => {
        // XXX: wait to update of git pull
        setTimeout(() => {
          atom.notifications.addInfo('Ready to beepro!!!')
          this.joinBeepro(id.replace(/\n/g, ''))
          this.syncing = false
        }, 3000)
      })
  }
}
