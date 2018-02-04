'use babel'

export default {

  resume: {
    type: 'resume'
  },

  join: {
    type: 'join'
  },

  create: {
    type: 'create',
    path: null,
    contents: ''
  },

  delete: {
    type: 'delete',
    path: null,
    contents: ''
  },

  move: {
    type: 'move',
    path: null,
    to: null,
    contents: ''
  },

  change: {
    type: 'change',
    path: null,
    contents: null,
    change: {
      from: {
        row: null,
        col: null
      },
      to: {
        row: null,
        col: null
      },
      text: ''
    }
  },

  honey: {
    git: {
      url: '',
      branch: ''
    },
    commit: {
      message: 'beepro making commit',
      interval: 1
    }
  }
}
