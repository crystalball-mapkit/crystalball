#!/usr/bin/env node
/* eslint-disable no-use-before-define */

import fs from 'fs';
import path from 'path';

const dir = './dist/geojson/';

function readDir(_dir) {
  fs.readdir(_dir, (err, filez) => {
    if (err) {
      console.warn('0noz! caught error! dir:', _dir, ' err:', err);
    } else {
      readFilez(filez, _dir);
    }
  });
}

function readFilez(filez, _dir) {
  filez.forEach(f => {
    const filePath = path.resolve(_dir, f);
    if (fs.lstatSync(filePath).isDirectory()) {
      readDir(filePath);
    } else {
      // eslint-disable-next-line no-unused-vars
      fs.readFile(filePath, 'utf-8', (err, content) => {
        if (err) {
          console.warn('1noz! caught error! dir:', _dir, ' f:', f, 'err:', err);
        } else {
          const data = JSON.parse(fs.readFileSync(filePath));
          fs.writeFile(filePath, JSON.stringify(data), err => {
            if (err) {
              console.warn('2noz! caught error! ..bad .geoJSON data? dir:', _dir, ' err:', err);
            } else {
              console.info('minified:', filePath);
            }
          });
        }
      });
    }
  });
}

// INIT
readDir(dir);
