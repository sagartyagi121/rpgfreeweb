const { app, BrowserWindow, Menu, dialog } = require('electron')


// Keep a global reference of the window object
let win; 

// SET ENV
process.env.NODE_ENV = 'development';

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1000,
    height: 900,
    webPreferences: {
      nodeIntegration: true
    }
  }); 

  // Load the index.html of the app.
  win.loadFile('./public/index.html')
  
    // On window close
  win.on('closed', () => {
    // clear window array 
    win = null
  });

  // Build menu from template
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  // Insert menu
  Menu.setApplicationMenu(mainMenu);

}

// When electron is ready start loading the files 
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// Create menu template
const mainMenuTemplate =  [
  // Each object is a dropdown
  {
    label: 'File',
    submenu:[
      {
        label: 'Slect File',
        accelerator:process.platform == 'darwin' ? 'Command+U' : 'Ctrl+U',
        click(){
          openDialogBox();
        }
      },
      {
        label: 'Quit',
        accelerator:process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
        click(){
          app.quit();
        }
      }
    ]
  }
];

// Add developer tools option if in dev
if(process.env.NODE_ENV !== 'production'){
  mainMenuTemplate.push({
    label: 'Developer Tools',
    submenu:[
      {
        role: 'reload'
      },
      {
        label: 'Toggle DevTools',
        accelerator:process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
        click(item, focusedWindow){
          focusedWindow.toggleDevTools();
        }
      }
    ]
  });
}

function createWindow () {
  // Create the browser window.
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  win.loadFile('/pblic/index.html')
}

app.on('ready', createWindow)