'use babel';

import git from 'git-promise';
import fs from 'fs-extra';
import jschardet from 'jschardet';
import { resume, createText, deleteText, moveText, changeText, createHoneyComb } from './api-resource.js';
import BeeproDancerAtomView from './beepro-dancer-atom-view';
import { CompositeDisposable } from 'atom';
import { createHoney, uploadFile } from './api.js';
import { changeDance, deleteDance, changedByMe, deleteByMe, createByMe, moveByMe} from './dance.js';

let locked = true;

export default {

  beeproDancerAtomView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.beeproDancerAtomView = new BeeproDancerAtomView(state.beeproDancerAtomViewState);
    this.modalPanel = atom.workspace.addModalPanel({item: this.beeproDancerAtomView.getElement(), visible: false});

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'beepro-dancer-atom:toggle': () => this.toggle(),
      'beepro-dancer-atom:notify': () => this.activateBeePro()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.beeproDancerAtomView.destroy();
  },

  serialize() {
    return {beeproDancerAtomViewState: this.beeproDancerAtomView.serialize()};
  },

  toggle() {
    console.log('BeeproDancerAtom was toggled!');
    return (
      this.modalPanel.isVisible()
      ? this.modalPanel.hide()
      : this.modalPanel.show());
  },

  activateBeePro() {
    //global objects
    honeyCombId = '';
    socket = null;
    who = '';

    atom.project.onDidChangeFiles(events => {
      for (const event of events) {

        // For Ctrl + N case
        if (event.path == null) {
          continue;
        }

        // TODO need to fetch .gitignore files.
        const check = event.path.replace(atom.project.getPaths()[0],'')
                                .replace(/^\//g,'');
        if (check.startsWith('.git') || check.startsWith('node_modules')) {
          continue;
        }

        console.log('event', event);
        // "created", "modified", "deleted", or "renamed"
        console.log(`Event action: ${event.action}`)

        if (event.action === 'created') {
          // TODO consider when the empty file is created.
          let isTextFile = this.isTextFile(event.path);
          isTextFile ? this.createFile(event.path.replace(atom.project.getPaths()[0], '.'))
                     : uploadFile(event.path);
        } else if (event.action === 'deleted') {
          console.log("file is deleted");
          this.deleteFile(event.path.replace(atom.project.getPaths()[0], '.'));
        } else if (event.action === 'renamed') {
          console.log("file is renamed");
          this.moveFile(event.oldPath.replace(atom.project.getPaths()[0], '.'), event.path.replace(atom.project.getPaths()[0], '.'));
          console.log(`.. renamed from: ${event.oldPath}`)
        } else if (event.action === 'modified') {
        }
      }
    });

    atom.workspace.onDidChangeActiveTextEditor(() => this.registerActiveText());
    atom.workspace.onDidAddTextEditor(({textEditor}) => this.createNewTextFile(textEditor));

    this.registerActiveText();
    createHoney().then((url) => this.startWebsocket(url));
  },

  isTextFile(absolutePath){
    const file = fs.readFileSync(absolutePath);

    // TODO verify
    // Empty file is defined as test file at once.
    if (!file.toString() || file.toString() == null) {
      console.log('file.toString()', file.toString());
      console.log('empty');
      return true;
    }

    console.log('jschardet.detect(file).encoding', jschardet.detect(file).encoding);
    if ( jschardet.detect(file).encoding == null) {
      return false;
    } else {
      return true;
    };
  },

  eventCheck() {
    atom.notifications.addInfo('callback is executed');
  },

  registerActiveText() {
    let editor = atom.workspace.getActiveTextEditor();
    // For binary file case
    if (editor != null) {
      // For commend + N case
      if (editor.getPath() != null) {
        let path = editor.getPath().replace(atom.project.getPaths()[0], '.');
        editor.getBuffer().onDidChange(({changes}) => this.assignment(changes, path));
      }
    }
  },

  createFile(path) {
    if (locked) {
      console.log('ignore dance');
      return;
    }
    this.eventCheck();
    createText.who = who;
    createText.path = path;
    if (this.socket && createByMe(createText)) {
      this.socket.send(JSON.stringify(createText));
      console.log('send createText');
    }
  },

  deleteFile(path) {
    if (locked) {
      console.log('ignore dance');
      return;
    }
    this.eventCheck();
    deleteText.who = who;
    deleteText.path = path;
    if (this.socket && deleteByMe(path)) {
      this.socket.send(JSON.stringify(deleteText));
      console.log('send deleteText');
    }
  },

  moveFile(oldPath, newPath) {
    if (locked) {
      console.log('ignore dance');
      return;
    }
    moveText.who = who;
    moveText.path = oldPath;
    moveText.to = newPath;
    if (this.socket && moveByMe(moveText)) {
      send(this.socket, moveText);
      // this.socket.send(JSON.stringify(moveText));
      console.log('send moveText');
    }
  },

  createNewTextFile(textEditor) {
    if (textEditor.getPath() != null) {
      const path = textEditor.getPath().replace(atom.project.getPaths()[0], '.');
      textEditor.getBuffer().onDidChange(({changes}) => this.assignment(changes, path));
    }
  },

  assignment(textBuffer, path) {
    if (locked) {
      console.log('ignore dance');
      return;
    }
    console.log('textBuffer', textBuffer);
    changeText.who = who;
    changeText.path = path;
    changeText.change.text = textBuffer[0].newText;
    changeText.change.from.row = textBuffer[0].oldRange.start.row;
    changeText.change.from.col = textBuffer[0].oldRange.start.column;
    changeText.change.to.row = textBuffer[0].oldRange.end.row;
    changeText.change.to.col = textBuffer[0].oldRange.end.column;
    console.log(JSON.stringify(changeText, undefined, 1));
    if (this.socket && changedByMe(changeText)) {
      // send(this.socket, moveText);
      console.log('send changeText');
      this.socket.send(JSON.stringify(changeText));
      console.log('send changeText');
    }
    atom.workspace.getActiveTextEditor().save();
  },

  startWebsocket(url) {
    console.log('url', url);
    this.socket = new WebSocket(url);

    // Keep alive
    interval = setInterval(() => {
      this.socket.send('KEEPALIVE');
    }, 5000);

    this.socket.onmessage = (msg) => {
      console.log('socket', JSON.parse(msg.data));
      const TYPE = JSON.parse(msg.data).type;
      if ( TYPE === 'sync') {
        this.activateReposiroty();
      } else if ( TYPE === 'change' ) {
        changeDance(JSON.parse(msg.data));
      } else if ( TYPE === 'delete') {
        deleteDance(JSON.parse(msg.data));
      }
    };
  },

  resumeBeePro() {
    if (this.socket) {
      this.socket.send(JSON.stringify(resume));
      console.log('resume beepro');
    }
  },

  activateReposiroty() {
    let path = atom.project.getPaths()[0];
    let branch = atom.project.getRepositories()[0].branch;
    locked = true;
    //TODO until resume has been finished, atom should be locked.
    return git(`fetch origin ${branch}`, { cwd: path })
      .then(() =>
        git(`reset --hard HEAD`, { cwd: path }))
      .then(() =>
        git(`pull origin ${branch}`, { cwd: path }))
      .then(() => {
        git(`config --get-all user.name`, { cwd: path })
          .then((user) => {
            who = user.replace(/\n/g,"");
          });
        console.log('who', who);
      })
      .then(() => {
        setTimeout(() => {
          locked = false;
          atom.notifications.addInfo('Ready to beepro!!!');
        }, 3000);
        this.resumeBeePro();
      });
  },

};
