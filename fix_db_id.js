const fs = require('fs');
let code = fs.readFileSync('Code.gs', 'utf8');

const target = `function getDbId() {
  return PropertiesService.getScriptProperties().getProperty(SCRIPT_PROP_DB_ID);
}`;

const replacement = `const HARDCODED_DB_ID = '1poJCOnIkHwmyIIixr34M9ofC7KTZAVl09JaqULANRso'; // Added your DB ID here

function getDbId() {
  const propId = PropertiesService.getScriptProperties().getProperty(SCRIPT_PROP_DB_ID);
  // If SCRIPT_PROP_DB_ID was modified by the user directly to be the ID, return it.
  // Otherwise return the propId, or the HARDCODED_DB_ID.
  if (SCRIPT_PROP_DB_ID && SCRIPT_PROP_DB_ID.length > 30) return SCRIPT_PROP_DB_ID;
  return propId || HARDCODED_DB_ID;
}`;

code = code.replace(target, replacement);
fs.writeFileSync('Code.gs', code);
console.log('Fixed getDbId');
