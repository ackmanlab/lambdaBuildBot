const request = require('request')
const fs = require('fs')
const path = require('path')
const tar = require('tar-fs')
const zlib = require('zlib')
const gunzip = zlib.createGunzip()

const mdbuild = require('woola')
const getConfig = require('./node_modules/woola/lib/appconfig.js')

const ghtoken = process.env.GITHUB_ACCESS_TOKEN
const localDir = path.resolve('./tmp')

console.log('Loading lambdaBuildBot, current dir: ' + process.cwd())

exports.handler = function (event, context) {
  // console.log('Received event:', JSON.stringify(event, null, 2))
  const message = event.Records[0].Sns.Message
  const mobj = JSON.parse(message)
  const archiveURL = mobj.repository.archive_url.replace('{archive_format}{/ref}','tarball/master')
  const repoDirname = localDir + '/' + mobj.repository.full_name.replace('/','-') + '-' + mobj.head_commit.id
  const site = getConfig({config: repoDirname + '/config.js'})
  site.options.srcPath = repoDirname //source directory
  site.options.dstPath = localDir + '/dist' // destination directory for the distribution

  const reqOptions = {
    url: archiveURL,
    headers: {
      'Authorization': 'token ' + ghtoken,
      'User-Agent': 'ghlambdabot'
    } 
  }
  console.log(`'Requesting: '${archiveURL}`)
  // console.log(`'Saving: '${repoDirname}`)

  const stream = request(reqOptions, (error, response, body) => {
    if (error) {
        // callback(error)
      } else if (response && response.statusCode && !response.statusCode.toString().startsWith('2')) {
        // callback(new Error(`GitHub API request failed with status ${response.statusCode}`));
      } else {
        // callback(null, {'message': `success`})
        console.log('message: ' + 'success')
      }
  })


  const build = function () {
    console.log(`'Saving: '${repoDirname}`)
    if (fs.existsSync(repoDirname)) {
      // console.log(repoDirname + ' exists!')
      mdbuild(site)
      // callback(null, {'message': `more success`})
    } else {
      console.log(repoDirname + ' does not exist')
    }  
  }

  // stream
  //   .pipe(gunzip)
  //   .pipe(tar.extract(localDir))
  //   .on('finish', build)

    build()
}

// const req = (reqOptions) => new Promise((resolve, reject)) => {  
//   request(reqOptions, (error, response, body) => {
//     if (error) {
//         reject(error);
//       } else if (response && response.statusCode && !response.statusCode.toString().startsWith('2')) {
//         reject(new Error(`GitHub API request failed with status ${response.statusCode}`));
//       } else {
//         resolve(null, {'message': `success`});
//       }
//   })
//   .pipe(gunzip).pipe(tar.extract('./tmp'))
// }

// const req = (repoDirname) => new Promise((resolve, reject)) => {
//   if (fs.existsSync(repoDirname)) {
//     console.log(repoDirname + ' exists!')
//   } else {
//     console.log(repoDirname + ' does not exist')
//   }
// }
