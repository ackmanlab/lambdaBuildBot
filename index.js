const request = require('request')
const fs = require('fs')
const path = require('path')
const glob = require('glob')
const tar = require('tar-fs')
const zlib = require('zlib')
const gunzip = zlib.createGunzip()

const AWS = require('aws-sdk')
AWS.config.region = process.env.AWS_REGION
const s3 = new AWS.S3()

const mdbuild = require('woola')
const appconfig = require('./node_modules/woola/lib/appconfig.js')

const ghtoken = process.env.GITHUB_ACCESS_TOKEN
const localStore = process.env.LOCAL_DIR
// const localStore = path.resolve('/tmp')
// const globPattern = '**/*'

let site

const computeContentType = (filename) => {
  const parts = filename.split('.')
  switch (filename.split('.')[parts.length-1]) {
    case 'png':
      return 'image/png'
    case 'jpg':
      return 'image/jpg'
    case 'html':
      return 'text/html'
    case 'js':
      return 'application/javascript'
    case 'css':
      return 'text/css'
  }
}

const uploadStream = (file,s3bucket,srcPath='.') => {
  const fileStream = fs.createReadStream(path.join(path.resolve(srcPath),file))
  fileStream.on('error', function(err) {
    console.log('File Error', err)
  })

  const uploadParams = {
    Bucket: s3bucket,
    Body: fileStream,
    Key: file, 
    ContentType: computeContentType(file),
    CacheControl: 'max-age=60'
  }

  s3.upload (uploadParams, function (err, data) {
    if (err) {
      console.log("Error", err)
      // reject(err)
    } if (data) {
      console.log("Upload Success", data.Location)
      // resolve(data)
    }
  })
}

console.log('Loading lambdaBuildBot, current dir: ' + process.cwd())

exports.handler = function (event, context) {
  console.log('Received event:', JSON.stringify(event, null, 2))
  const message = event.Records[0].Sns.Message
  const mobj = JSON.parse(message)
  // console.log(mobj)
  const archiveURL = mobj.repository.archive_url.replace('{archive_format}{/ref}','tarball/master')
  const repoDirname = localStore + '/' + mobj.repository.full_name.replace('/','-') + '-' + mobj.head_commit.id

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

  function getConfig(flags={config: repoDirname + '/config.js'}, callback) {
    site = appconfig(flags)
    site.options.srcPath = path.join(repoDirname, site.options.srcPath) //source directory
    site.options.dstPath = localStore + '/dist' // destination directory for the distribution
    site.options.globPattern = '**/*'
    if (typeof callback === 'function') {
      callback(site)
    } else {
      return site
    }
  }


  function readdir (site, callback) {
    glob(site.options.globPattern, {cwd: site.options.dstPath, nodir: true}, (err, files) => {
      if (err) console.log(err)
      else { 
        // console.log('str: ' + str)
        // return(mylog(files))
        if (typeof callback === 'function') {
          callback(site, files)
        } else {
          console.log(files)
          return files
        }
      }
    })
  }

  function uploadFiles (site, files) {
    // TODO: add cache.replace(/[0-9]+/,300) need to change uploadParams location
    files.forEach(file => {
      // TODO: add other endpoint options with logic testing for S3 vs other services
      uploadStream(file, site.s3_bucket, site.options.dstPath)
    })
  }


  const build = function () {
    console.log(`'Saving: '${repoDirname}`)
    if (fs.existsSync(repoDirname)) {
      getConfig({config: repoDirname + '/config.js'}, () => {
        mdbuild(site,() => {
          readdir(site, uploadFiles)
        })
      })
    } else {
      console.log(repoDirname + ' does not exist')
    }  
  }

  if (mobj.ref === "refs/heads/master") {    
    stream
      .pipe(gunzip)
      .pipe(tar.extract(localStore))
      .on('finish', build)

      // build() //testing
    } else {
      console.log(`Exiting without build/deploy...input branch was not master, instead it was ${mobj.ref}`)
    }
}
