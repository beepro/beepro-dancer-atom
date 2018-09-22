'use babel'
import path from 'path';
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
  active: {
    buffer: null,
    editor: null,
    path: null
  },
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

  send (json) {
    if (this.socket) {
      const str = JSON.stringify(json)
      console.log('# send', str)
      this.socket.send(str)
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
        'beepro-dancer-atom:activate': () => this.activateBeePro(),
        'beepro-dancer-atom:deactivate': () => this.deactivateBeePro()
      })
    )

    fs.exists(path.join(atom.project.getPaths()[0],'.beerc'), (isExists) => {
      if (isExists) {
        this.activateBeePro();
      }
    });
  },

  serialize () {
    return { beeproDancerAtomViewState: this.beeproDancerAtomView.serialize() }
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

    atom.workspace.onDidChangeActiveTextEditor(() => this.listen())
    this.listen()
    createHoney().then(url => this.startWebsocket(url))
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

  listen () {
    console.log('# listen')
    const editor = atom.workspace.getActiveTextEditor()

    // unlisten when already listened
    if (this.active.subscriber) {
      this.active.subscriber.dispose()
    }

    // Ignore change dance if binary
    if (!editor) {
      this.active = {
        editor: null,
        buffer: null,
        path: null,
        subscriber: null
      }
      return
    }
    // For commend + N case
    if (editor.getPath() != null) {
      const path = editor
        .getPath()
        .replace(atom.project.getPaths()[0], '')
        .replace(/^\//g, '')
      const buffer = editor.getBuffer()
      this.active = {
        editor,
        buffer,
        path,
        subscriber: buffer.onDidChange(({ changes }) => {
          this.assignment(
            changes,
            path,
            editor.getCursorBufferPosition(),
            buffer
          )
        })
      }
    }
  },

  createFile (path) {
    if (this.syncing) {
      console.log('ignore dance: create')
      return
    }
    this.eventCheck()
    this.send({
      ...model.create,
      path
    })
  },

  deleteFile (path) {
    if (this.syncing) {
      console.log('ignore dance: delete')
      return
    }
    this.eventCheck()
    this.send({
      ...model.delete,
      path
    })
  },

  moveFile (oldPath, newPath) {
    if (this.syncing) {
      console.log('ignore dance: move')
      return
    }
    this.send({
      ...model.move,
      path: oldPath,
      to: newPath
    })
  },

  assignment (changes, path, cursor, buffer) {
    const change = changes[0]
    if (this.syncing || this.locked) {
      console.log('ignore dance: change', change.newText)
      this.locked = false
      return
    }
    const dance = {
      ...model.change,
      path,
      change: {
        text: change.newText,
        from: {
          row: change.oldRange.start.row,
          col: change.oldRange.start.column
        },
        to: {
          row: change.oldRange.end.row,
          col: change.oldRange.end.column
        }
      }
    }
    this.send(dance)
    buffer.save()
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
        this.locked = changeDance(JSON.parse(msg.data), this.active)
      } else if (TYPE === 'delete') {
        deleteDance(JSON.parse(msg.data))
        this.locked = false
      } else if (TYPE === 'create') {
        createDance(JSON.parse(msg.data))
        this.locked = false
      }
    }
  },

  joinBeepro (id, icon) {
    this.send({
      ...model.join,
      user: {
        id,
        icon
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
      .then(() => git(`clean -d -f`, { cwd: path }))
      .then(() => git(`pull origin ${branch}`, { cwd: path }))
      .then(() => git(`config --get-all user.name`, { cwd: path }))
      .then(id => fetch("https://api.github.com/users/" + id.replace(/\n/g, '')))
      .then(res => res.json())
      .then(
        json => {
          // XXX: wait to update of git pull
          setTimeout(() => {
            atom.notifications.addInfo('Ready to beepro!!!')
            this.joinBeepro(json.login.replace(/\n/g, ''), json.avatar_url)
            this.syncing = false
            this.locked = false
          }, 3000)
        },
        err => {
          console.log(err)
        }
      )
  }
}
