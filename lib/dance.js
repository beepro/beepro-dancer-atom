'use babel';

import fs from 'fs-extra';
import waggleDance from 'waggle-dance';

createStock = [];
moveStock = [];
deleteStock = [];
changeStock = [];
dances = [];

export function addDanceQue(dance) {
  dances.push(dance);
}

export function dance() {
  // Keep alive
  interval = setInterval(() => {
    if (dances.length > 0) {
      changeDance(dances.shift());
    }
  }, 1000);
}

//TODO verification for several cases
export function changeDance(dance){
  const absolutePath = `${atom.project.getPaths()[0]}/${dance.path}`;
  const file = fs.readFileSync(absolutePath);
  let newText = waggleDance.apply(file.toString(), dance.change);
  this.changeStock.push(dance.change);
  console.log('changeStock was pushed', this.changeStock);
  fs.writeFileSync(absolutePath, newText);
}

export function deleteDance(dance){
  const absolutePath = `${atom.project.getPaths()[0]}/${dance.path}`;
  this.deleteStock.push(dance.path);
  fs.removeSync(absolutePath);
  console.log('end deleteDance');
}

export function createDance(dance){
  const absolutePath = `${atom.project.getPaths()[0]}/${dance.path}`;
  this.createStock.push(dance);
  fs.outputFileSync(absolutePath, dance.contents, 'utf8');
  console.log('end createDance');
}

export function moveDance(dance) {
  const absolutePath = `${atom.project.getPaths()[0]}/${dance.path}`;
  const destinationPath = `${atom.project.getPaths()[0]}/${dance.to}`;
  this.moveStock.push(dance);
  fs.moveSync(absolutePath, destinationPath);
  console.log('end moveDance');
}

export function changedByMe(changeText) {
  const changeJSON = JSON.stringify(changeText.change);
  let matched = true;
  console.log('origin changeStock', this.changeStock);
  this.changeStock.some(function(v, i){
    if (JSON.stringify(v) == changeJSON) {
      this.changeStock.splice(i,1);
      console.log('spliced', this.changeStock);
      matched = false;
    }
  });
  if (matched) {
    console.log('unmatched');
    console.log('changeText', changeText);
    console.log('changeStock', this.changeStock);
  }
  return matched;
}

export function deleteByMe(path) {
  let matched = true;
  this.deleteStock.some(function(v, i){
    if (v===path) {
      this.deleteStock.splice(i,1);
      console.log('matched', this.deleteStock);
      matched = false;
    }
  });
  return matched;
}

export function createByMe(text) {
  // TODO
  return true;
  let matched = true;
  this.createStock.some(function(v, i){
    if (text.path === v.path && text.contents === v.contents) {
      this.createStock.splice(i,1);
      console.log('matched', this.createStock);
      matched = false;
    }
  });
  return matched;
}

export function moveByMe(text) {
  let matched = true;
  this.moveStock.some(function(v, i){
    if (text.path === v.path && text.to === v.to) {
      this.moveStock.splice(i,1);
      console.log('matched', this.moveStock);
      matched = false;
    }
  });
  return matched;
}

function sleep(time) {
  return new Promise((resolve, reject) => {
      setTimeout(() => {
          resolve();
      }, time);
  });
}
