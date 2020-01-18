import RPG from '../rpg/RPG';

export function convertCode(type) {
  var input = document.getElementById('input');
  var userDefinedTab = document.getElementById('userDefinedTab');
  var output = document.getElementById('output');
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
