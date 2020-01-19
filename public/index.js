import { convertCode } from './convertCode';
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

