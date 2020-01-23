var RPG = require('./rpg/RPG');
var output = document.getElementById('output');

function freeMyRPG(){
  convertCode('text').then(
    function(convertedCode){
      var data = convertedCode ;
      output.value = data.lines.join('\n') ;
      var messageHTML = "";
       if (data.messages.length > 0) {
         for (var message of data.messages) {
           messageHTML += "<tr><td>" + message.line + "</td><td>" + message.text + "</td></tr>";
         }
         messages.innerHTML = messageHTML;
       }
    });
}

function convertCode(type) {
  var input = document.getElementById('input');
  var userDefinedTab = document.getElementById('userDefinedTab');
  var messages = document.getElementById('messages');
  var inputstring = JSON.stringify(input.value);
  var lines = input.value.split('\n');
  var indent = userDefinedTab.value;

  if (type === 'text') {
    lines.push('', '');
    var conv = new RPG(lines, Number(indent));
    conv.parse();
    let requestConvert = { lines, messages: conv.messages };
    return requestConvert;
  }
}

