'use babel'

import fs from 'fs-extra'
import model from './model'

let honeyCombId = ''
let danceUrl = ''
const DOMAIN = 'https://honeycomb-v1.herokuapp.com'

export function createHoney () {
  return new Promise(resolve => {
    const requestHeader = new Headers()
    requestHeader.append('Content-Type', 'application/json')
    Promise.all(
      atom.project
        .getDirectories()
        .map(dir => atom.project.repositoryForDirectory(dir))
    ).then(repos => {
      const repo = repos[0]
      fetch(`${DOMAIN}/api/honeys`, {
        method: 'post',
        headers: requestHeader,
        body: JSON.stringify({
          ...model.honey,
          git: {
            url: repo.getOriginURL(),
            branch: repo.getShortHead()
          }
        })
      }).then(response =>
        response
          .json()
          .then(data => ({
            data: data,
            status: response.status
          }))
          .then(res => {
            honeyCombId = res.data.id
            danceUrl = res.data.dance.url
            console.log('danceUrl', danceUrl)
            resolve(danceUrl)
          })
      )
    })
  })
}

export function uploadFile (absolutePath) {
  console.log('uploadFile')
  const file = fs.readFileSync(absolutePath)
  const PATH = absolutePath
    .replace(atom.project.getPaths()[0], '')
    .replace(/^\//g, '')
  const formData = new FormData()
  formData.append('file', new File([file.buffer], 'file'))
  const url = `${DOMAIN}/api/honeys/${honeyCombId}/files/${PATH}`
  fetch(url, {
    method: 'post',
    body: formData
  })
}
