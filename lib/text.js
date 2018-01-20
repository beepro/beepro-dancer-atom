'use babel';

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
