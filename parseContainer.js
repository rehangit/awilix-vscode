const vscode = require('vscode');

module.exports = async container => {
  const containerText = container.getText();
  const filtered = containerText
    .match(/\.register\({([\s\S]+?)}\);/gm)
    .join('')
    .replace(/\.register\({([\s\S]+?)}\);/gm,'$1')
    .replace(/^.+?require.+?$/gm, '')
    .replace(/(\/\/.*|\/\*[\s\S]+?\*\/)/gm,'')
    .replace(/(asFunction|asValue)\(([\s\S]+?)\)(,|\.(singleton|transient|scoped|setLifetime)\(.*?\),)/gm,'\'$2\',')
    .replace(/\.\.\./gm, '')
    .replace(/\(.*?\)\s+?=>\s+?(\S)/gm,'$1')
    .replace(/\s+/gm,' ')
      
  let containerMap = {};
  try { 
    containerMap = eval('new Object({' + filtered + '})') 
  } catch(err) {
    console.error(err);
  }
  return vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', container.uri)
    .then(symbols => 
      JSON.parse(JSON.stringify(symbols))
        .reduce((obj, s) => {
          obj[s.name] = s.location.range;
          return obj;
        }, 
        {})
    )
    .then(containerSymbolsMap => {
      const containerResolved = Object.keys(containerMap).reduce((ret, key) => {
        const name = containerMap[key]
        ret[key] = containerSymbolsMap[name] || {};
        ret[key].name = name;
        return ret;
      }, {});
      console.dir(containerResolved);
      return containerResolved;
    });
  }
