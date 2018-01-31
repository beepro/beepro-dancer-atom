'use babel';

export let resume = {
  type: 'resume'
}

export let createText = {
  type: 'create',
  path: null,
  who: '',
  contents: '',
};

export let deleteText = {
  type: 'delete',
  path: null,
  who: '',
  contents: '',
};

export let moveText = {
  type: 'move',
  path: null,
  to: null,
  who: '',
  contents: '',
};

export let changeText = {
  type: 'change',
  path: null,
  who: '',
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
    url: '',
    branch: ''
  },
  commit: {
    message: 'beepro making commit',
    interval: 1
  }
};
