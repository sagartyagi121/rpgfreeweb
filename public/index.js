const RPG = require('./rpg/RPG.js' );
const { dialog } = require('electron').remote;

// const bodyParser = require('body-parser');
const formidable = require('formidable');
const readline = require('readline');
// const express = require('express');
const fs = require('fs');
// const app = express();

// catch the code and send for conversion 
function freeMyRPG(){
  let convertedCode = convertCode('text') ; 
  var data = convertedCode ;
  var output = document.getElementById('output');
  output.value = data.lines.join('\n') ;
  var messageHTML = "";
  if (data.messages.length > 0) {
      for (var message of data.messages) {
        messageHTML += "<tr><td>" + message.line + "</td><td>" + message.text + "</td></tr>";
      }
      messages.innerHTML = messageHTML;
  }
}

function convertCode(type) {
  var input = document.getElementById('input');
  var userDefinedTab = document.getElementById('userDefinedTab');
  var messages = document.getElementById('messages');
  var inputstring = JSON.stringify(input.value);
  var lines = input.value.split('\n');
  var indent = userDefinedTab.value;
  
  if (type == 'text') {
    lines.push('', '');
    var conv = new RPG(lines, Number(indent));
    conv.parse();
    let requestConvert = { lines, messages: conv.messages };
    return requestConvert;
  }
}

var inputLabel = document.getElementById('inputLabel');
  
// Open Dialog to select file to convert 
function selectFile(){
  const selectedPaths = dialog.showOpenDialogSync({
    title: 'Select your file',
    message: 'Select your file',
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (selectedPaths != undefined){
    inputLabel.innerHTML = selectedPaths[0]; 
  }
}

function convertFile(){
  let filePathToConvert = inputLabel.innerHTML; 
  var newLine = []; 
  // Create an object to initiate read interface line by line 
  const readInterface = readline.createInterface({
    input: fs.createReadStream(filePathToConvert),
    output: process.stdout,
    console: false
  }); 
  
  // on every line read push the line into newLine Array 
  readInterface.on('line', function(line) {
    newLine.push( line ) ; 
  });

  // When file reading is completed send newLine Array for conversion  
  readInterface.on('close', function(line) {
    var conv = new RPG(newLine, Number('2'));
    conv.parse();
            
    fs.unlink(filePathToConvert, (err) => {
      if (err) throw err;
      let file = fs.createWriteStream(filePathToConvert);
      file.on('error', function(err) { Console.log(err) });
      conv.lines.forEach(value => file.write(`${value}\r\n`));
      file.end();
      file.on('close', function() {
        alert(`Your file is waiting for you at 
               ${filePathToConvert}`);  
      });
    });
  });
}