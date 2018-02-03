'use babel'

import fs from 'fs-extra'
import { createHoneyComb } from './api-resource.js'

let honeyCombId = ''
let danceUrl = ''
const DOMAIN = 'https://honeycomb-v1.herokuapp.com'

export function createHoney () {
  return new Promise(resolve => {
    const requestHeader = new Headers()
    requestHeader.append('Content-Type', 'application/json')
    const repo = atom.project.getRepositories()[0]
    createHoneyComb.git.url = repo.getOriginURL()
    createHoneyComb.git.branch = repo.branch.replace(/refs\/heads\//g, '')
    fetch(`${DOMAIN}/api/honeys`, {
      method: 'post',
      headers: requestHeader,
      body: JSON.stringify(createHoneyComb)
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
}

export function uploadFile (absolutePath) {
  console.log('uploadFile')
  const file = fs.readFileSync(absolutePath)
  const PATH = absolutePath
    .replace(atom.project.getPaths()[0], '')
    .replace(/^\//g, '')
  const formData = new FormData()
  formData.append('file', new File([file.buffer], 'file'))
  const url = `${DOMAIN}/api/honeys/:id/files/:path_of_file`
    .replace(':id', honeyCombId)
    .replace(':path_of_file', PATH)
  fetch(url, {
    method: 'post',
    body: formData
  })
}
