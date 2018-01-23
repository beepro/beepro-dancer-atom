'use babel';

export let createText = {
  type: 'create',
  path: null,
  who: 'taka66',
  contents: '',
};

export let deleteText = {
  type: 'delete',
  path: null,
  who: 'taka66',
  contents: '',
};

export let moveText = {
  type: 'move',
  path: null,
  to: null,
  who: 'taka66',
  contents: '',
};

export let changeText = {
  type: 'change',
  path: null,
  who: 'taka66',
  contents: null,
  change: {
    from : {
      row : null,
      col : null
    },
    to : {
      row : null,
      col : null
    },
    text : ''
  }
};

export let createHoneyComb = {
  git: {
    url: 'https://github.com/beepro/beepro-dancer-test.git',
    branch: 'master'
  },
  commit: {
    message: 'beepro making commit',
    interval: 1
  }
};
