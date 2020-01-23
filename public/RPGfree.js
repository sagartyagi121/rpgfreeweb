(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var RPG = require('./rpg/RPG');

export function freeMyRPG(){
  convertCode('text').then(
    function(convertedCode){
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


},{"./rpg/RPG":2}],2:[function(require,module,exports){
const specs = {
  'C': require('./specs/C'),
  'F': require('./specs/F'),
  'D': require('./specs/D'),
  'H': require('./specs/H'),
  'P': require('./specs/P')
};

class Message {
  constructor(line, text) {
    this.line = line;
    this.text = text;
  }
}

module.exports = class RPG {
  constructor(lines, indent) {
    this.currentLine = -1;
    this.lines = lines;
    this.indent = indent;
    this.vars = {
      '*DATE': {
        name: '*DATE',
        type: 'D',
        len: 10
      }
    };

    this.messages = [];
  }

  addVar(obj) {
    if (obj.standalone === true)
      this.vars[obj.name.toUpperCase()] = obj;
  }

  suggestMove(obj) {
    var result = {
      change: false,
      value: ""
    }

    var sourceVar = this.vars[obj.source.toUpperCase()];
    var targetVar = this.vars[obj.target.toUpperCase()];

    if (sourceVar === undefined) {
      if (obj.source.startsWith("'")) { //This means it's a character
        sourceVar = {
          name: obj.source,
          type: 'A',
          len: (obj.source.length - 2)
        }

        if (targetVar === undefined) {
          //Basically.. if we're assuming that if the targetvar
          //is undefined (probably in a file) but we are moving
          //character date into it, let's assume it's a char field

          this.messages.push(new Message(this.currentLine, "Assuming " + obj.target + " is a character field for MOVE/MOVEL operation."));

          targetVar = {
            name: obj.target,
            type: "A"
          };
        }
      } else if (obj.source.startsWith('*')) {
        sourceVar = {
          name: obj.source,
          type: "S" //I think we can pretend it's numeric and it'll still work
        }
      } else { //Is numeric
        sourceVar = {
          name: obj.source,
          type: "S",
          len: obj.source.length
        }
      }
      sourceVar.const = true;
    } else {
      switch (sourceVar.type) {
        case 'D':
          sourceVar.len = 10;
          sourceVar.const = true;
          break;
        case 'T':
          sourceVar.len = 8;
          sourceVar.const = true;
          break;
      }
    }

    if (targetVar === undefined && sourceVar !== undefined) {
      this.messages.push(new Message(this.currentLine, "Assuming " + obj.target + " is a type '" + sourceVar.type + "' for MOVE/MOVEL operation."));
      //Here we are assuming the target type based on the source type :)
      targetVar = {
        name: obj.target,
        type: sourceVar.type
      }
    }

    if (targetVar !== undefined) {
      var assignee = targetVar.name;

      switch (targetVar.type) {
        case 'S': //numeric (not specific to packed or zoned)
          result.value = assignee + " = " + sourceVar.name;
          break;
      
        case 'D': //date
          if (sourceVar.name.toUpperCase() === "*DATE") {
            result.value = targetVar.name + " = " + sourceVar.name;
          } else {
            if (obj.attr === "")
              result.value = targetVar.name + " = %Date(" + sourceVar.name + ")";
            else
              result.value = targetVar.name + " = %Date(" + sourceVar.name + ":" + obj.attr + ")";
          }
          break;

        case 'A': //character
          if (obj.padded) {
            if (obj.dir === "MOVEL")
              assignee = targetVar.name;
            else
              assignee = "EvalR " + targetVar.name;
          } else {
            if (obj.dir === "MOVEL")
              if (sourceVar.const)
                assignee = "%Subst(" + targetVar.name + ":1:" + sourceVar.len + ")";
              else
                assignee = "%Subst(" + targetVar.name + ":1:%Len(" + sourceVar.name + "))";
            else
            if (sourceVar.const)
              assignee = "%Subst(" + targetVar.name + ":%Len(" + targetVar.name + ")-" + sourceVar.len + ")";
            else
              assignee = "%Subst(" + targetVar.name + ":%Len(" + targetVar.name + ")-%Len(" + sourceVar.name + "))";
          }

          switch (sourceVar.type) {

            case 'A':
              result.value = assignee + " = " + sourceVar.name;
              break;

            case 'S':
            case 'P':
            case 'I':
            case 'F':
            case 'U':
              result.value = assignee + " = %Char(" + sourceVar.name + ")";
              break;

            case 'D':
            case 'T':
              if (obj.attr !== "")
                result.value = assignee + " = %Char(" + sourceVar.name + ":" + obj.attr + ")";
              else
                result.value = assignee + " = %Char(" + sourceVar.name + ")";
          }

          break;
      }

    }

    if (result.value !== "") {
      result.change = true;
      result.value = result.value.trimRight() + ';';
    } else {
      this.messages.push(new Message(this.currentLine, "Unable to convert MOVE/MOVEL operation."));
    }
    return result;
  }

  parse() {
    var length = this.lines.length;
    var line, comment, isMove, hasKeywords, ignoredColumns, spec, spaces = 0;
    var result;
    var wasSub = false,
      lastBlock = "";
    for (var index = 0; index < length; index++) {
      if (this.lines[index] === undefined) continue;
      
      this.currentLine = index;

      comment = "";
      line = ' ' + this.lines[index].padEnd(80);
      if (line.length > 81) {
        line = line.substr(0, 81);
        comment = this.lines[index].substr(80);
      }
      ignoredColumns = line.substr(1, 4);

      spec = line[6].toUpperCase();
      switch (line[7]) {
        case '/':
          spec = '';

          switch (line.substr(8).trim().toUpperCase()) {
            case 'FREE':
            case 'END-FREE':
              this.lines.splice(index, 1);
              index--;
              break;
            default:
              this.lines[index] = "".padEnd(8) + "".padEnd(spaces) + line.substr(7).trim();
              break;
          }
          break;
        case '*':
          spec = '';

          comment = line.substr(8).trim();
          if (comment !== "")
            this.lines[index] = "".padEnd(8) + "".padEnd(spaces) + "//" + comment;
          else
            this.lines[index] = "";
          break;
      }

      if (specs[spec] !== undefined) {
        result = specs[spec].Parse(line,this.indent);

        if (result.isSub === true) {
          wasSub = true;
          lastBlock = result.blockType;
          
        } else if (result.isSub === undefined & wasSub) {
          endBlock(this.lines,this.indent);
        }

        if (result.var !== undefined)
          this.addVar(result.var);

        isMove = (result.move !== undefined);
        hasKeywords = (result.aboveKeywords !== undefined);

        if (result.message) {
          this.messages.push(new Message(this.currentLine, result.message));
        }

        switch (true) {
          case isMove:
            result = this.suggestMove(result.move);
            if (result.change) {
              this.lines[index] = ignoredColumns + "    " + "".padEnd(spaces) + result.value;
            }
            break;

          case hasKeywords:
            var endStmti = this.lines[index - 1].indexOf(';');
            var endStmt = this.lines[index - 1].substr(endStmti); //Keep those end line comments :D

            this.lines[index - 1] = this.lines[index - 1].substr(0, endStmti) + ' ' + result.aboveKeywords + endStmt;
            this.lines.splice(index, 1);
            index--;
            break;

          case result.remove:
            if (comment.trim() !== "") {
              this.lines[index] = ignoredColumns + "    " + "".padEnd(spaces) + '//' + comment;
            } else {
              this.lines.splice(index, 1);
              index--;
              length++;
            }
            break;

          case result.change:
            spaces += result.beforeSpaces;

            if (result.arrayoutput) {

              this.lines.splice(index, 1);

              for (var y in result.arrayoutput) {
                result.arrayoutput[y] = ignoredColumns + "    " + "".padEnd(spaces) + result.arrayoutput[y];

                this.lines.splice(index, 0, result.arrayoutput[y]);
                index++;
                length++;
              }

              index--;

            } else {
              this.lines[index] = ignoredColumns + "    " + "".padEnd(spaces) + result.value;
              if (comment.trim() !== "") {
                this.lines[index] += ' //' + comment;
              }
            }
            
            spaces += result.nextSpaces;
            break;
        }

      } else {
        if (wasSub) {
          endBlock(this.lines,this.indent);
        }
      }
    }

    function endBlock(lines,indent) {
      spaces -= indent;
      if (lastBlock !== undefined) {
        lines.splice(index, 0, "".padEnd(8) + "".padEnd(spaces) + "End-" + lastBlock + ";");
        index++;
        length++;
      }
      wasSub = false;
    }
  }
}
},{"./specs/C":3,"./specs/D":4,"./specs/F":5,"./specs/H":6,"./specs/P":7}],3:[function(require,module,exports){
var Lastkey = "";
var Lists = {};

var EndList = [];

module.exports = {
    Parse: function (input, indent) {
        var output = {
            remove: false,
            change: false,
            value: "",

            beforeSpaces: 0,
            nextSpaces: 0
        };

        var spaces = 0;
        var sep = "";

        var factor1 = input.substr(12, 14).trim();
        var opcode = input.substr(26, 10).trim().toUpperCase();
        var plainOp = "";
        var extender = "";
        var factor2 = input.substr(36, 14).trim();
        var extended = input.substr(36).trim();
        var result = input.substr(50, 14).trim();

        var ind1 = input.substr(71, 2).trim();
        var ind2 = input.substr(73, 2).trim();
        var ind3 = input.substr(75, 2).trim();

        var condition = {
            not: (input.substr(9, 1).toUpperCase() === "N"),
            ind: input.substr(10, 2).trim()
        };

        var arrayoutput = [];

        plainOp = opcode;
        if (plainOp.indexOf('(') >= 0) {
            plainOp = opcode.substr(0, opcode.indexOf('('));
            extender = opcode.substring(opcode.indexOf('(')+1, opcode.indexOf(')'));
        }

        switch (plainOp) {
            case "PLIST":
            case "KLIST":
                LastKey = factor1.toUpperCase();
                Lists[LastKey] = [];
                output.remove = true;
                break;
            case "PARM":
            case "KFLD":
                //Handle var declaration
                Lists[LastKey].push(result);
                output.remove = true;
                break;
            case "ADD":
                output.value = result + " = " + result + " + " + factor2;
                break;
            case "BEGSR":
                output.value = opcode + " " + factor1;
                output.nextSpaces = indent;
                break;
            case "CAT":
                if (factor2.indexOf(":") >= 0) {
                    spaces = Number(factor2.split(':')[1]);
                    factor2 = factor2.split(':')[0].trim();
                }
                output.value = result + " = " + factor1 + "+ '" + "".padStart(spaces) + "' + " + factor2;
                break;
            case "CALL":
                factor2 = factor2.substring(1, factor2.length-1);
                if (Lists[result.toUpperCase()])
                    output.value = factor2 + "(" + Lists[result.toUpperCase()].join(':') + ")";
                else
                    output.value = factor2 + '()';
                break;
            case "CHAIN":
                if (Lists[factor1.toUpperCase()])
                    output.value = opcode + " (" + Lists[factor1.toUpperCase()].join(':') + ") " + factor2 + " " + result;
                else
                    output.value = opcode + " " + factor1 + " " + factor2 + " " + result;
                break;
            case "CHECK":
                output.value = result + " = %Check(" + factor1 + ":" + factor2 + ")";
                break;
            case "CHECKR":
                output.value = result + " = %CheckR(" + factor1 + ":" + factor2 + ")";
                break;
            case "CLEAR":
                output.value = opcode + " " + factor1 + " " + factor2 + " " + result;
                break;
            case "CLOSE":
                output.value = opcode + " " + factor2;
                break;
            case "DELETE":
                output.value = opcode + " " + factor2;
                break;
            case "DIV":
                output.value = result + " = " + factor1 + " / " + factor2;
                break;
            case "DO":
                output.value = "For " + result + " = " + factor1 + " to " + factor2;
                output.nextSpaces = indent;
                EndList.push('Enddo');
                break;
            case "DOU":
            case "DOW":
                output.value = opcode + " " + extended;
                output.nextSpaces = indent;
                EndList.push('Enddo');
                break;
            case "DOWEQ":
                output.value = "Dow " + factor1 + " = " + factor2;
                output.nextSpaces = indent;
                EndList.push('Enddo');
                break;
            case "DOWNE":
                output.value = "Dow " + factor1 + " <> " + factor2;
                output.nextSpaces = indent;
                EndList.push('Enddo');
                break;
            case "DOWGT":
                output.value = "Dow " + factor1 + " > " + factor2;
                output.nextSpaces = indent;
                EndList.push('Enddo');
                break;
            case "DOWLT":
                output.value = "Dow " + factor1 + " < " + factor2;
                output.nextSpaces = indent;
                EndList.push('Enddo');
                break;
            case "DOWGE":
                output.value = "Dow " + factor1 + " >= " + factor2;
                output.nextSpaces = indent;
                EndList.push('Enddo');
                break;
            case "DOWLE":
                output.value = "Dow " + factor1 + " <= " + factor2;
                output.nextSpaces = indent;
                EndList.push('Enddo');
                break;
            case "DSPLY":
                output.value = opcode + " (" + factor1 + ") " + factor2 + " " + result;
                break;
            case "ELSE":
                output.beforeSpaces = -indent;
                output.value = opcode + " " + factor2;
                output.nextSpaces = indent;
                break;
            case "ELSEIF":
                output.beforeSpaces = -indent;
                output.value = opcode + " " + factor2;
                output.nextSpaces = indent;
                break;
            case "END":
                if (EndList.length > 0) {
                    output.beforeSpaces = -indent;
                    output.value = EndList.pop();
                } else {
                    output.message = "Operation " + plainOp + " will not convert; no matching block found.";
                }
                break;
            case "ENDDO":
                output.beforeSpaces = -indent;
                output.value = opcode;
                EndList.pop()
                break;
            case "ENDIF":
                output.beforeSpaces = -indent;
                output.value = opcode;
                EndList.pop()
                break;
            case "ENDMON":
                output.beforeSpaces = -indent;
                output.value = opcode;
                break;
            case "ENDSL":
                output.beforeSpaces = -(indent*2);
                output.value = opcode;
                EndList.pop()
                break;
            case "ENDSR":
                output.beforeSpaces = -indent;
                output.value = opcode;
                break;
            case "CALLP":
            case "EVAL":
                output.value = extended;
                break;
            case "EVALR":
                output.value = opcode + " " + extended;
                break;
            case "EXCEPT":
                output.value = opcode + " " + factor2;
                break;
            case "EXFMT":
                output.value = opcode + " " + factor2;
                break;
            case "EXSR":
                output.value = opcode + " " + factor2;
                break;
            case "FOR":
                output.value = opcode + " " + extended;
                output.nextSpaces = indent;
                break;
            case "ANDEQ":
                output.aboveKeywords = "AND " + factor1 + " = " + factor2;
                break;
            case "IF":
                output.value = opcode + " " + extended;
                output.nextSpaces = indent;
                EndList.push('Endif');
                break;
            case "IFGT":
                output.value = "If " + factor1 + " > " + factor2;
                output.nextSpaces = indent;
                EndList.push('Endif');
                break;
            case "IFLT":
                output.value = "If " + factor1 + " < " + factor2;
                output.nextSpaces = indent;
                EndList.push('Endif');
                break;
            case "IFEQ":
                output.value = "If " + factor1 + " = " + factor2;
                output.nextSpaces = indent;
                EndList.push('Endif');
                break;
            case "IFNE":
                output.value = "If " + factor1 + " <> " + factor2;
                output.nextSpaces = indent;
                EndList.push('Endif');
                break;
            case "IFGE":
                output.value = "If " + factor1 + " >= " + factor2;
                output.nextSpaces = indent;
                EndList.push('Endif');
                break;
            case "IFLE":
                output.value = "If " + factor1 + " <= " + factor2;
                output.nextSpaces = indent;
                EndList.push('Endif');
                break;
            case "IN":
                output.value = opcode + " " + factor1 + " " + factor2;
                break;
            case "ITER":
                output.value = opcode;
                break;
            case "LEAVE":
                output.value = opcode;
                break;
            case "LEAVESR":
                output.value = opcode;
                break;
            case "LOOKUP":
                output.value = "*In" + ind3 + " = (%Lookup(" + factor1 + ":" + factor2 + ") > 0)";
                break;
            case "MONITOR":
                output.value = opcode;
                output.nextSpaces = indent;
                break;
            case "MOVE":
            case "MOVEL":
                output.move = {
                    target: result,
                    source: factor2,
                    attr: factor1,
                    dir: plainOp,
                    padded: (extender === "P")
                }
                break;
            case "MULT":
                output.value = result + " = " + factor1 + " * " + factor2;
                break;
            case "ON-ERROR":
                output.beforeSpaces = -indent;
                output.value = opcode + " " + factor2;
                output.nextSpaces = indent;
                break;
            case "OPEN":
                output.value = opcode + " " + factor2;
                break;
            case "OUT":
                output.value = opcode + " " + factor1 + " " + factor2;
                break;
            case "OTHER":
                output.beforeSpaces = -indent;
                output.value = opcode;
                output.nextSpaces = indent;
                break;
            case "READ":
            case "READC":
                output.value = opcode + " " + factor2 + " " + result;
                break;
            case "READE":
                output.value = opcode + " " + factor1 + " " + factor2 + " " + result;
                break;
            case "READP":
                output.value = opcode + " " + factor2 + " " + result;
                break;
            case "READPE":
                output.value = opcode + " " + factor1 + " " + factor2 + " " + result;
                break;
            case "RETURN":
                output.value = opcode + " " + factor2;
                break;
            case "SCAN":
                output.value = result + " = %Scan(" + factor1 + ":" + factor2 + ")";
                break;
            case "SELECT":
                output.value = opcode;
                output.nextSpaces = (indent*2);
                EndList.push('Endsl');
                break;
            case "SETGT":
                if (Lists[factor1.toUpperCase()])
                    output.value = opcode + " (" + Lists[factor1.toUpperCase()].join(':') + ") " + factor2;
                else
                    output.value = opcode + " " + factor1 + " " + factor2;
                break;
            case "SETLL":
                if (Lists[factor1.toUpperCase()])
                    output.value = opcode + " (" + Lists[factor1.toUpperCase()].join(':') + ") " + factor2;
                else
                    output.value = opcode + " " + factor1 + " " + factor2;
                break;
            case "SORTA":
                output.value = opcode + " " + extended;
                break;
            case "SUB":
                output.value = result + " = " + factor1 + " - " + factor2;
                break;
            case "SETOFF":
                if (ind1 != "") arrayoutput.push("*In" + ind1 + " = *Off;");
                if (ind2 != "") arrayoutput.push("*In" + ind2 + " = *Off;");
                if (ind3 != "") arrayoutput.push("*In" + ind3 + " = *Off;");
                break;
            case "SETON":
                if (ind1 != "") arrayoutput.push("*In" + ind1 + " = *On;");
                if (ind2 != "") arrayoutput.push("*In" + ind2 + " = *On;");
                if (ind3 != "") arrayoutput.push("*In" + ind3 + " = *On;");
                break;
            case "SUBST":
                if (factor2.indexOf(":") >= 0) {
                    sep = factor2.split(':')[1];
                    factor2 = factor2.split(':')[0].trim();
                }
                output.value = result + " = %Subst(" + factor2 + ":" + sep + ":" + factor1 + ")";
                break;
            case "UNLOCK":
                output.value = opcode + " " + factor2;
                break;
            case "UPDATE":
                output.value = opcode + " " + factor2 + " " + result;
                break;
            //TODO: Other WHEN conditions
            case "WHEN":
                output.beforeSpaces = -indent;
                output.value = opcode + " " + extended;
                output.nextSpaces = indent;
                break;
            case "WHENEQ":
                output.beforeSpaces = -indent;
                output.value = "When " + factor1 + " = " + factor2;
                output.nextSpaces = indent;
                break;
            case "WRITE":
                output.value = opcode + " " + factor2 + " " + result;
                break;
            case "Z-ADD":
                output.value = result + " = 0 + " + factor2;
                break;
            case "Z-SUB": 
                output.value = result + " = 0 - " + factor2;
                break;

            case "TIME":
                output.value = result + " = %Time()";
                break;
            
            default:
                if (plainOp == "") {
                    if (extended !== "") {
                        output.aboveKeywords = extended;
                    } else {
                        //Set to blank
                        output.change = true;
                        output.value = "";
                    }
                } else {
                    output.message = "Operation " + plainOp + " will not convert.";
                }
                break;
        }

        if (output.value !== "") {
            output.change = true;
            output.value = output.value.trimRight() + ';';
        }

        if (condition.ind !== "" && output.change) {
            arrayoutput.push("If" + (condition.not ? " NOT" : "") + " *In" + condition.ind + ";");
            arrayoutput.push("  " + output.value);
            arrayoutput.push('Endif;');
        }

        if (arrayoutput.length > 0) {
            output.change = true;
            output.arrayoutput = arrayoutput;
        }
        return output;
    }
}
},{}],4:[function(require,module,exports){
var isSubf = false;
var prevName = "";
var blockType = "";
var DSisQualified = false;

module.exports = {
  Parse: function (input, indent) {
    var output = {
      remove: false,
      change: false,
      value: "",

      beforeSpaces: 0,
      nextSpaces: 0,

      var: {
        standalone: false,
        name: '',
        type: '',
        len: 0
      }
    };

    var potentialName = input.substr(7).trim();
    var name = input.substr(7, 14).trim();
    var pos = input.substr(30, 3).trim();
    var len = input.substr(33, 7).trim();
    var type = input.substr(40, 1).trim();
    var decimals = input.substr(41, 3).trim();
    var field = input.substr(24, 2).trim().toUpperCase();
    var keywords = input.substr(44).trim();

    output.var.standalone = (field === "S");
    output.var.name = name;
    output.var.type = type;
    output.var.len = Number(len);

    if (keywords.endsWith('+')) {
      keywords = keywords.substr(0, keywords.length-1);
    }

    if (type == "") {
      if (decimals == "")
        output.var.type = "A"; //Character
      else
        output.var.type = "S"; //Zoned
    }

    if (pos != "") {
      len = String(Number(len) - Number(pos) + 1);
      keywords = "Pos(" + pos + ") " + keywords;
    }


    if (prevName != "") {
      name = prevName;
      prevName = "";
    }
    if (potentialName.endsWith("...")) {
      prevName = potentialName.substr(0, potentialName.length - 3);
      output.remove = true;
    }

    if (output.remove === false) {
      switch (type.toUpperCase()) {
        case "A":
          if (keywords.toUpperCase().indexOf("VARYING") >= 0) {
            keywords = keywords.replace(/varying/ig, '');
            type = "Varchar";
          } else {
            type = "Char";
          }
          type += "(" + len + ")";
          break;
        case "B":
          type = "Bindec" + "(" + len + ")";
          break;
        case "C":
          type = "Ucs2" + "(" + len + ")";
          break;  
        case "D":
          type = "Date";
          break;
        case "F":
          type = "Float" + "(" + len + ")";
          break;
        case "G":
          if (keywords.toUpperCase().indexOf("VARYING") >= 0) {
            keywords = keywords.replace(/varying/ig, '');
            type = "Vargraph";
          } else {
            type = "Graph";
          }
          type += "(" + len + ")";
          break;
        case "I":
          type = "Int" + "(" + len + ")";
          break;
        case "N":
          type = "Ind";
          break;
        case "P":
          type = "Packed" + "(" + len + ":" + decimals + ")";
          break;
        case "S":
          type = "Zoned" + "(" + len + ":" + decimals + ")";
          break;
        case "T":
          type = "Time";
          break;
        case "U":
          type = "Uns" + "(" + len + ")";
          break;
        case "Z":
          type = "Timestamp";
          break;
        case "*":
          type = "Pointer";
          break;
        case "":
          if (len != "") {
            if (decimals == "") {
              if (keywords.toUpperCase().indexOf("VARYING") >= 0) {
                keywords = keywords.replace(/varying/ig, '');
                type = "Varchar";
              } else {
                type = "Char";
              }
              type += "(" + len + ")";
            } else {
              if (isSubf) {
                type = "Zoned" + "(" + len + ":" + decimals + ")";
              } else {
                type = "Packed" + "(" + len + ":" + decimals + ")";
              }
            }
          }
          break;
      }

      switch (field) {
        case "C":
          output.value = "Dcl-C " + name.padEnd(10) + " " + keywords;
          break;
        case "S":
          output.value = "Dcl-S " + name.padEnd(12) + " " + type.padEnd(10) + " " + keywords;
          break;
        case "DS":
        case "PR":
        case "PI":
          if (field == "DS" && input.substr(23, 1).trim().toUpperCase() == "S")
            keywords = "PSDS " + keywords;

          if (keywords.toUpperCase().indexOf('QUALIFIED') === -1)
            DSisQualified = false;

          if (name == "") name = "*N";
          isSubf = (field == "DS");
          output.value = "Dcl-" + field + " " + name + " " + type + " " + keywords;

          output.isSub = true;
          output.blockType = field;
          blockType = field;

          output.nextSpaces = indent;
          break;
        case "":
          output.isSub = true;
          if (name == "") name = "*N";
          if (name == "*N" && type == "") {
            output.aboveKeywords = keywords;
            output.remove = true;
            output.blockType = blockType;
          } else {
            //(isSubf ? "Dcl-Subf" : "Dcl-Parm")
            output.value = name.padEnd(14) + " " + type.padEnd(10) + " " + keywords;

            output.blockType = blockType;

            if (!DSisQualified)
              output.var.standalone = true;
          }
          break;
      }
    }

    if (output.value !== "") {
      output.change = true;
      output.value = output.value.trimRight() + ';';
    }
    return output;
  }
}
},{}],5:[function(require,module,exports){
module.exports = {
    Parse: function (input, indent) {
        var output = {
            remove: false,
            change: false,
            value: "",

            beforeSpaces: 0,
            nextSpaces: 0
        };

        var name = input.substr(7, 10).trim(); //File name
        var type = input.substr(17, 1).toUpperCase(); // I, U, O, C
        var field = input.substr(34, 1).toUpperCase(); //KEYED
        var device = input.substr(36, 7).toUpperCase().trim(); //device: DISK, WORKSTN
        var keywords = input.substr(44).trim();

        output.value = "Dcl-F " + name;

        switch (type) {
            case "I":
                type = "*Input";
                break;
            case "U":
                type = "*Update:*Delete:*Output";
                break;
            case "O":
                if (device != "PRINTER")
                    type = "*Output";
                else
                    type = "";
                break;
            case "C":
                if (device != "WORKSTN")
                    type = "*INPUT:*OUTPUT";
                else
                    type = "";
                break;

            default:
                type = "";
                break;
        }

        if (device != "DISK")
            output.value += ' ' + device;

        if (type != "")
            output.value += " Usage(" + type + ")";

        if (field == "K")
            output.value += " Keyed";

        if (keywords != "") {
            if (name == "")
                output.aboveKeywords = keywords;
            else
                output.value += " " + keywords;
        }

        if (output.value !== "") {
            output.change = true;
            output.value = output.value.trimRight() + ';';
        }
        return output;
    }
}
},{}],6:[function(require,module,exports){
module.exports = {
  Parse: function (input, indent) {
      var output = {
          remove: false,
          change: false,
          value: "",

          beforeSpaces: 0,
          nextSpaces: 0
      };

      keywords = input.substr(7);
      output.value = "Ctl-Opt " + keywords.trim();

      if (output.value !== "") {
          output.change = true;
          output.value = output.value.trimRight() + ';';
      }
      return output;
  }
}
},{}],7:[function(require,module,exports){
var prevName = "";

module.exports = {
  Parse: function (input, indent) {
    var output = {
      remove: false,
      change: false,
      value: "",

      beforeSpaces: 0,
      nextSpaces: 0
    };

    var name = input.substr(7, 16).trim();
    var keywords = input.substr(44).trim();

    input = input.trimRight();

    if (prevName != "") {
      name = prevName;
      prevName = "";
    }
    if (input.endsWith("...")) {
      prevName = input.substr(7, input.length - 10).trim();
      output.remove = true;
    } else {
      switch (input[24].toUpperCase()) {
        case 'B':
          output.value = ("Dcl-Proc " + name + " " + keywords).trimRight();
          output.nextSpaces = 2;
          break;
        case 'E':
          output.beforeSpaces = -indent;
          output.value = "End-Proc";
          break;
      }
    }

    if (output.value !== "") {
      output.change = true;
      output.value = output.value.trimRight() + ';';
    }
    return output;
  }
}
},{}]},{},[1]);
