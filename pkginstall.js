var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');

var info = require('./lib/detect');
var download = require('./lib/download');

var url = process.argv[2] || process.env.LOOPBACK_ORACLE_URL;
var dest = process.argv[3];
var version = null;

if (!dest) {
  // Check if it is within the loopback-connector-oracle node_modules
  var parent = path.join(__dirname, '../../node_modules');
  if (fs.existsSync(parent)) {
    dest = parent;
    try {
      var pkg = require('../../package.json');  // The parent module
      if (pkg.config && pkg.config.oracleUrl) {
        // Allow env var to override config.oracleUrl
        url = url || pkg.config.oracleUrl;
        version = pkg.config.oracleVersion;
      }
    } catch (err) {
      // Ignore
    }
  }
}

// Check to see if `strong-oracle` is already installed, in case
// they'd prefer compiling it themselves
if(process.env.npm_config_force || !fs.existsSync(path.join(parent, 'strong-oracle'))) {
    // First download the archive
    download(url, version, dest, function (err, result) {
      if (err) {
        process.exit(1);
      }

      // Now try to run post-installation scripts
      var inst_dir = path.dirname(process.argv[1]);

      var installer = path.join(inst_dir, 'bin/installers', info.platform, 'installer.sh');
      // First check the child module
      var icdir = path.join(inst_dir, 'node_modules/instantclient');
      if (!fs.existsSync(icdir)) {
        // Now the peer module
        icdir = path.join(inst_dir, '../instantclient');
      }

      var args = [ installer, icdir ];
      var cmd = '/bin/sh';

    // console.log('DEBUG: Running command %s %s = ', installer, args);
      if (process.platform === 'win32') {
        installer = path.join(inst_dir, 'bin/installers/Windows/installer.bat');
        args = ['/c', installer];
        cmd = 'cmd';
      }
      var child = spawn(cmd, args, {stdio: 'inherit'});
      child.on('exit', function () {
        process.exit(child.exitCode);
      });
    });
}
