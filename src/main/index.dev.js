/**
 * This file is used specifically and only for development. It installs
 * `electron-debug` & `vue-devtools`. There shouldn't be any need to
 *  modify this file, but it can be used to extend your development
 *  environment.
 */

/* eslint-disable */

// Set environment for development

// Install `electron-debug` with `devtron`
require('electron-debug')({ showDevTools: true })

// Install `vue-devtools`
require('electron').app.on('ready', () => {
  // 手动加载 vue-devtools，前提是 npm install vue-devtools --save-dev
  const {BrowserWindow} = require("electron");
  BrowserWindow.addDevToolsExtension('node_modules/vue-devtools/vender')
})

console.log('index.dev starting...')
// Require `main` process to boot app
require('./index')
