'use babel';

import git from 'git-promise';
import {createText, deleteText, moveText, changeText, createHoneyComb} from './api-resource.js';
import BeeproDancerAtomView from './beepro-dancer-atom-view';
import {CompositeDisposable} from 'atom';

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
    honeyCombUrl = '';
    socket = null;

    console.log(atom.workspace);

    atom.project.onDidChangeFiles(events => {
      for (const event of events) {

        if (event.path == null) {
          continue;
        }

        const check = event.path.replace(atom.project.getPaths()[0],'').replace(/^\//g,'');

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
          this.createFile(event.path.replace(atom.project.getPaths()[0], '.'));
          console.log(path);
        } else if (event.action === 'deleted') {
          console.log("file is deleted");
          this.deleteFile(event.path.replace(atom.project.getPaths()[0], '.'));
          console.log(path);
        } else if (event.action === 'renamed') {
          console.log("file is renamed");
          this.moveFile(event.oldPath.replace(atom.project.getPaths()[0], '.'), event.path.replace(atom.project.getPaths()[0], '.'));
          console.log(`.. renamed from: ${event.oldPath}`)
        }
      }
    });

    atom.workspace.onDidChangeActiveTextEditor(() => this.registerActiveText());
    atom.workspace.onDidAddTextEditor(({textEditor}) => this.createNewTextFile(textEditor));
    // atom.notifications.addInfo('Hello World!');

    this.registerActiveText();
    this.createHoneyComb();
  },

  eventCheck() {
    atom.notifications.addInfo('callback is executed');
  },

  registerActiveText() {
    let editor = atom.workspace.getActiveTextEditor();
    let text = editor.getText();
    let title = editor.getTitle();
    // For commend + N case
    if (editor.getPath() != null) {
      let path = editor.getPath().replace(atom.project.getPaths()[0], '.');
      editor.getBuffer().onDidChange(({changes}) => this.assignment(changes, path));
    }
  },

  createFile(path) {
    this.eventCheck();
    createText.path = path;
    // if (this.socket) {
    //   this.socket.send(JSON.stringify(createText));
    //   console.log('send createText');
    // }
  },

  deleteFile(path) {
    this.eventCheck();
    deleteText.path = path;
    // if (this.socket) {
    //   this.socket.send(JSON.stringify(deleteText));
    //   console.log('send deleteText');
    // }
  },

  moveFile(oldPath, newPath) {
    this.eventCheck();
    moveText.path = oldPath;
    moveText.to = newPath;
    // if (this.socket) {
    //   this.socket.send(JSON.stringify(moveText));
    //   console.log('send moveText');
    // }
  },

  createNewTextFile(textEditor) {
    this.eventCheck();
    console.log('textEditor', textEditor);
    if (textEditor.getPath() != null) {
      const path = textEditor.getPath().replace(atom.project.getPaths()[0], '.');
      textEditor.getBuffer().onDidChange(({changes}) => this.assignment(changes, path));
    }
  },

  assignment(textBuffer, path) {
    changeText.path = path;
    changeText.change.text = textBuffer[0].newText;
    changeText.change.from.row = textBuffer[0].oldRange.start.row;
    changeText.change.from.col = textBuffer[0].oldRange.start.column;
    changeText.change.to.row = textBuffer[0].oldRange.end.row;
    changeText.change.to.col = textBuffer[0].oldRange.end.column;
    // console.log(JSON.stringify(changeText, undefined, 1));
    // if (this.socket) {
    //   this.socket.send(JSON.stringify(changeText));
    //   console.log('send changeText');
    // }
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
    };
  },

  resume() {
    if (this.socket) {
      this.socket.send(JSON.stringify(resume));
      console.log('send resumeText');
    }
  },

  activateReposiroty() {
    let path = atom.project.getPaths()[0];
    let branch = atom.project.getRepositories()[0].branch;
    console.log('path', path);
    console.log('branch', branch);
    return git(`fetch ${branch}`, { cwd: path })
      .then(() =>
        git(`pull origin ${branch}`, { cwd: path }))
      .then(() => this.resume());
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
        this.honeyCombUrl = res.data.dance.url;
        this.startWebsocket(res.data.dance.url);
      })
    );
  }

};
