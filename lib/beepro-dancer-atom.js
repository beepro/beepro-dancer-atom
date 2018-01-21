'use babel';

import {changeText, createHoneyComb} from './text.js';
import BeeproDancerAtomView from './beepro-dancer-atom-view';
import {CompositeDisposable} from 'atom';
import AtomSocket from 'atom-socket';

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
      'beepro-dancer-atom:notify': () => this.notify()
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

  notify() {
    //global objects
    honeyCombUrl = '';
    socket = null;

    atom.notifications.addInfo('Hello World!');

    let editor = atom.workspace.getActiveTextEditor();
    console.log(atom.project.getRepositories());
    let text = editor.getText();
    let title = editor.getTitle();
    let path = editor.getPath().replace(atom.project.getPaths()[0], '.');
    editor.getBuffer().onDidChange(({changes}) => this.assignment(changes, path));
    this.createHoneyComb();
  },

  check() {
    console.log('text has been changed');
  },

  assignment(textBuffer, path) {
    changeText.path = path;
    changeText.change.text = textBuffer[0].newText;
    changeText.change.from.row = textBuffer[0].oldRange.start.row;
    changeText.change.from.col = textBuffer[0].oldRange.start.column;
    changeText.change.to.row = textBuffer[0].oldRange.end.row;
    changeText.change.to.col = textBuffer[0].oldRange.end.column;
    console.log(JSON.stringify(changeText, undefined, 1));
    if (this.socket) {
      this.socket.send(JSON.stringify(changeText));
      console.log('send changeText');
    }
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
    };
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
