const request = require('request')
const fs = require('fs')
const path = require('path')
const glob = require('glob')

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
  // console.log('Received event:', JSON.stringify(event, null, 2))
  const message = event.Records[0].Sns.Message
  const mobj = JSON.parse(message)
  // console.log(mobj)
  const downloadsUrl = mobj.repository.trees_url.replace('{/sha}', '/master?recursive=1');
  const repoDirname = localStore

  const reqHeaders1 = {
    'Authorization': 'token ' + ghtoken,
    'User-Agent': 'ghlambdabot'
  }

  const reqHeaders2 = {
    'Authorization': 'token ' + ghtoken,
    'User-Agent': 'ghlambdabot',
    'Accept': 'application/vnd.github-blob.raw'
  }

  console.log(`'Requesting: '${downloadsUrl}`)

  const stream = request({url: downloadsUrl, headers: reqHeaders1}, (error, response, body) => {
    if (error) {
      console.log(error)
    } else if (response && response.statusCode && !response.statusCode.toString().startsWith('2')) {
      console.log(`GitHub API request failed with status ${response.statusCode}`)
    } else {
      // console.log('message: ' + 'success')
      const bodyObj = JSON.parse(body)
      console.log(bodyObj)
      if (bodyObj.truncated) {
        console.log('Too many files for the GitHub tree api, try another portion of api like contents, archive_url, or clone repo')
      } else {

        const streamPromises = bodyObj.tree.map((fileObject) => {
          return new Promise((resolve, reject) => {
            if (fileObject.type === 'blob') {
              // console.log(fileObject.path)
              writeStream(fileObject,resolve,reject)
            } else if (fileObject.type === 'tree') {
              resolve( fs.mkdir(localStore + '/' + fileObject.path, () => {console.log(`make dir: ${fileObject.path}`)}) )
            } else {
              console.log('unknown object type returned from GitHub tree api response body')
            }
          })
        })  

        Promise.all(streamPromises)
        .then(() => { console.log('All input streams completed.') })
        .then(build)
        .catch (err => { console.log(err) })

      }
    }
  })

  function writeStream(fileObject,resolve,reject) {
    request({url: fileObject.url, headers: reqHeaders2})
      .pipe(fs.createWriteStream(localStore + '/' + fileObject.path))
      .on('finish', resolve)
      .on('error', reject)
  }

  function getConfig(flags={config: localStore + '/config.js'}, callback) {
    site = appconfig(flags)
    // TODO: global let bug for site.options.srcPath in appconfig.js upon hot start invocation, tmp fix follows
    // site.options.srcPath = path.join(localStore, site.options.srcPath) //source directory
    site.options.srcPath = localStore + '/src' //source directory
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
    // console.log(`'Saving: '${repoDirname}`)
    if (fs.existsSync(localStore)) {
      getConfig({config: path.resolve(localStore + '/config.js')}, () => {
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
    // build() //testing
    } else {
      console.log(`Exiting without build/deploy... input branch was ${mobj.ref} instead of master`)
    }
}
