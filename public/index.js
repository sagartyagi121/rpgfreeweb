const RPG = require('./rpg/RPG.js' );

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


app.post('/fileupload', function(req, res) {
  if (req.url == '/fileupload') {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      var oldpath = files.filetoupload.path;
      var newpath = 'C:/Users/krishna/Documents/a/' + files.filetoupload.name;
      var newLine = []; 
      fs.rename(oldpath, newpath, function (err) {
          if (err) throw err;
          const readInterface = readline.createInterface({
            input: fs.createReadStream(newpath),
            console: false
          });  
         
          let i = 0 ;  
          readInterface.on('line', function(line) {
          newLine.push( line ) ; 
          i++
          });

          // on file close 
          readInterface.on('close', function(line) {
            var conv = new RPG(newLine, Number('2'));
            conv.parse();
            
            fs.unlink(newpath, (err) => {
              if (err) throw err;
              var file = fs.createWriteStream(newpath);
              file.on('error', function(err) { Console.log(err) });
              conv.lines.forEach(value => file.write(`${value}\r\n`));
              file.end();
              file.on('close', function() {
                res.download(newpath); 
              });
             
            })
          });
      });

   });
  } 
});

