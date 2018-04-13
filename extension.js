// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "awilix-vscode" is now active!');
    vscode.window.showInformationMessage('Awilix project detected. Awilix definitions support is activated...');

    let containerSymbols;
    const containerFile = vscode.workspace.getConfiguration('awilix').get('containerFile');
    vscode.workspace.findFiles(containerFile,'',1)
        .then(files => vscode.workspace.openTextDocument(files[0].fsPath))
        .then(container => vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', container.uri))
        .then(symbols => {
            containerSymbols = symbols;
        })
        // .catch(err => {
        //     console.log('Error:', {err});
        // });
    let disposableImplementationProvider = vscode.languages.registerImplementationProvider('javascript', { provideImplementation(doc, pos, cancel) {
        console.log('Definition provider invoked.');
        containerSymbols.forEach(obj => {
            try {
                const path = obj.location.uri.path;
                const filename = path.toString().split('/').slice(-1)[0];
                const [f, t] = obj.location.range;
                console.log(`${obj.name} | ${obj.kind} | ${filename} | (${f.character},${f.line})`);
            } catch(e) {
                console.error(e);
            }
        });
    }});

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposableResolveAwilixSupport = vscode.commands.registerCommand('extension.resolveAwilixSymbol', function () {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        vscode.window.showInformationMessage('Trying to resolve awilix dependency...');
        vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', vscode.window.activeTextEditor.document.uri)
        .then(symbolsInCurrentDoc => {
            symbolsInCurrentDoc.map(({name, location}) => console.log(name, location.range.start.line, location.range.start.character));
        })
        // .then(result => {
        //     console.log('Result:',{result});
        // })
        // .catch(err => {
        //     console.log('Error:',{err});
        // });
            
    });

    let disposableEnable = vscode.commands.registerCommand('extension.enableAwilixSupport', function () {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        vscode.window.showInformationMessage('Enabling Awilix support...');
    });

    context.subscriptions.push(disposableResolveAwilixSupport);
    context.subscriptions.push(disposableEnable);
    context.subscriptions.push(disposableImplementationProvider);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}

exports.deactivate = deactivate;