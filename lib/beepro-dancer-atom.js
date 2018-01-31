'use babel';

import git from 'git-promise';
import fs from 'fs-extra';
import jschardet from 'jschardet';
import { resume, createText, deleteText, moveText, changeText, createHoneyComb } from './api-resource.js';
import BeeproDancerAtomView from './beepro-dancer-atom-view';
import { CompositeDisposable } from 'atom';
import waggleDance from 'waggle-dance';

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
    honeyCombUrl = '';
    socket = null;
    changeStock = [];
    // me = 'taka66';

    atom.project.onDidChangeFiles(events => {
      for (const event of events) {

        if (event.path == null) {
          continue;
        }

        const check = event.path.replace(atom.project.getPaths()[0],'')
                                .replace(/^\//g,'');

        //TODO need to fetch .gitignore files.
        if (check.startsWith('.git') || check.startsWith('node_modules')) {
          continue;
        }

        console.log('event', event);
        console.log('event.oldPath', event.oldPath);
        console.log('event.path', event.path);
        // "created", "modified", "deleted", or "renamed"
        console.log(`Event action: ${event.action}`)

        // absolute path to the filesystem entry that was touched
        console.log(`Event path: ${event.path}`)

        if (event.action === 'created') {
          // TODO consider when the empty file is created.
          let isTextFile = this.isTextFile(event.path);
          // console.log('isTextFile', isTextFile);
          isTextFile ? this.createFile(event.path.replace(atom.project.getPaths()[0], '.'))
                     : this.uploadFile(event.path);
          console.log(path);
        } else if (event.action === 'deleted') {
          console.log("file is deleted");
          this.deleteFile(event.path.replace(atom.project.getPaths()[0], '.'));
          console.log(path);
        } else if (event.action === 'renamed') {
          console.log("file is renamed");
          this.moveFile(event.oldPath.replace(atom.project.getPaths()[0], '.'), event.path.replace(atom.project.getPaths()[0], '.'));
          console.log(`.. renamed from: ${event.oldPath}`)
        } else if (event.action === 'modified') {
          let isTextFile = this.isTextFile(event.path);
          // console.log('isTextFile', isTextFile);
          // if (!isTextFile) this.uploadFile(event.path);
        }
      }
    });

    atom.workspace.onDidChangeActiveTextEditor(() => this.registerActiveText());
    atom.workspace.onDidAddTextEditor(({textEditor}) => this.createNewTextFile(textEditor));

    this.registerActiveText();
    this.createHoneyComb();
  },

  isTextFile(absolutePath){
    const file = fs.readFileSync(absolutePath);
    console.log('isTextFile', file);

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
    createText.path = path;
    if (this.socket) {
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
    deleteText.path = path;
    if (this.socket) {
      this.socket.send(JSON.stringify(deleteText));
      console.log('send deleteText');
    }
  },

  moveFile(oldPath, newPath) {
    if (locked) {
      console.log('ignore dance');
      return;
    }
    this.eventCheck();
    moveText.path = oldPath;
    moveText.to = newPath;
    if (this.socket) {
      this.socket.send(JSON.stringify(moveText));
      console.log('send moveText');
    }
  },

  createNewTextFile(textEditor) {
    console.log('textEditor', textEditor);
    if (textEditor.getPath() != null) {
      const path = textEditor.getPath().replace(atom.project.getPaths()[0], '.');
      console.log('path from createNewTextFile', path);
      textEditor.getBuffer().onDidChange(({changes}) => this.assignment(changes, path));
    }
  },

  assignment(textBuffer, path) {
    if (locked) {
      console.log('ignore dance');
      return;
    }
    console.log('textBuffer', textBuffer);
    changeText.path = path;
    changeText.change.text = textBuffer[0].newText;
    changeText.change.from.row = textBuffer[0].oldRange.start.row;
    changeText.change.from.col = textBuffer[0].oldRange.start.column;
    changeText.change.to.row = textBuffer[0].oldRange.end.row;
    changeText.change.to.col = textBuffer[0].oldRange.end.column;
    console.log(JSON.stringify(changeText, undefined, 1));
    console.log('changeText.change', changeText.change);
    if (this.socket && this.changedByMe(changeText)) {
      this.socket.send(JSON.stringify(changeText));
      console.log('send changeText');
    }
    atom.workspace.getActiveTextEditor().save();
  },

  changedByMe(changeText) {
    //TODO need to get actual who.
    // if (changeText.who == 'taka66') {
    //   return true;
    // }
    // assignment
    const changeJSON = JSON.stringify(changeText.change);
    let matched = true;
    console.log('changeJSON', changeJSON);
    console.log('changeStock', changeStock);
    changeStock.some(function(v, i){
      console.log('v', v);
      console.log('JSON.stringify(v)', JSON.stringify(v));
      if (JSON.stringify(v)===changeJSON) {
        changeStock.splice(i,1);
        console.log('matched', changeStock);
        matched = false;
      }
    });
    return matched;
  },

  startWebsocket(url) {
    console.log('url', url);
    this.socket = new WebSocket(url);

    // Keep alive
    interval = setInterval(() => {
      this.socket.send(JSON.stringify({}));
    }, 5000);

    this.socket.onmessage = (msg) => {
      console.log(msg);
      console.log(JSON.parse(msg.data).type);
      if ( JSON.parse(msg.data).type === 'sync') {
        this.activateReposiroty();
      } else if ( JSON.parse(msg.data).type === 'change' ) {
        this.changeDance(JSON.parse(msg.data));
      }
    };
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
        setTimeout(() => {
          locked = false;
          atom.notifications.addInfo('Ready to beepro!!!');
        }, 3000);
        this.resumeBeePro();
      });
  },

  resumeBeePro() {
    if (this.socket) {
      this.socket.send(JSON.stringify(resume));
      console.log('resume BeePro');
    }
  },

  createHoneyComb() {
    const requestHeader = new Headers();
    requestHeader.append('Content-Type', 'application/json');
    fetch('https://honeycomb-v1.herokuapp.com/api/honeys', {
      method: 'post',
      headers: requestHeader,
      body: JSON.stringify(createHoneyComb)
    }
      ).then(response =>
        response.json().then(data => ({
          data: data,
          status: response.status
        })
      ).then(res => {
        this.honeyCombId = res.data.id;
        this.honeyCombUrl = res.data.dance.url;
        this.startWebsocket(res.data.dance.url);
      })
    );
  },

  uploadFile(absolutePath) {
    console.log('uploadFile');
    const filePath = absolutePath.replace(atom.project.getPaths()[0], '')
                                 .replace(/^\//g,'');
    const file = fs.readFileSync(absolutePath);
    const formData = new FormData();
    formData.append('file', new File([file.buffer], 'file'));
    const url = 'https://honeycomb-v1.herokuapp.com/api/honeys/:id/files/:path_of_file'
                .replace(':id', this.honeyCombId)
                .replace(':path_of_file', filePath);
    fetch(url, {
      method: 'post',
      body: formData
    });
  },

  //TODO verification for several cases
  changeDance(dance){
    const absolutePath = `${atom.project.getPaths()[0]}/${dance.path}`;
    const file = fs.readFileSync(absolutePath);
    console.log('dance.change', dance.change);
    let newText = waggleDance.apply(file.toString(), dance.change);
    changeStock.push(dance.change);
    console.log('changeStock', changeStock);
    fs.writeFileSync(absolutePath, newText);
  }

};
