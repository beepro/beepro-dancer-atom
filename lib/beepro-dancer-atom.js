'use babel';

import {changeText} from '.text.js';
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
    atom.notifications.addInfo('Hello World!');
    let editor = atom.workspace.getActiveTextEditor();
    console.log(atom.project.getRepositories());
    let text = editor.getText();
    let title = editor.getTitle();
    let path = editor.getPath().replace(atom.project.getPaths()[0], '.');
    console.log(title);
    console.log(path);
    console.log(changeText);
    console.log(editor.getBuffer().getPath());
    console.log(`change text object is  ${this.changeText}`);
    editor.getBuffer().onDidChange(({changes}) => this.assignment(changes, path));
    this.websocket();
  },

  check() {
    console.log('text has been changed');
  },

  change(changes) {
    console.log(`oldText was ${changes[0].oldText}`);
    console.log(`newText is ${changes[0].newText}`);
    console.log('text buffer been changed');
  },

  assignment(textBuffer, path) {
    console.log(textBuffer);
    console.log(path);
    changeText.path = path;
    changeText.change.text = textBuffer[0].newText;
    changeText.change.from.row = textBuffer[0].oldRange.start.row;
    changeText.change.from.col = textBuffer[0].oldRange.start.column;
    changeText.change.to.row = textBuffer[0].oldRange.end.row;
    changeText.change.to.col = textBuffer[0].oldRange.end.column;
    console.log(JSON.stringify(changeText, undefined, 1));
  },

  websocket() {
    const socket = new AtomSocket('term', 'wss://echo.websocket.org');

    socket.on('error', (err) => {
      console.error(err);
    });

    socket.on('open', () => {
      console.log('Client Connected');
    });

    socket.on('close', () => {
      console.log('Client Closed');
    });

    socket.on('message', (msg) => {
      console.log(msg);
    });

    socket.on('open:cached', () => {
      console.log('Client Connected through Existing WebSocket');
    });

    socket.send('hello world');
    socket.close();
    socket.reset();

  }
};
