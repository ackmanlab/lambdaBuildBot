const request = require('request')
const fs = require('fs')
const path = require('path')
const glob = require('glob')
const tar = require('tar-fs')
const zlib = require('zlib')
const gunzip = zlib.createGunzip()

const AWS = require('aws-sdk')
AWS.config.region = process.env.AWS_REGION
// console.log(AWS.config.credentials.accessKeyId)
// console.log(AWS.config.region)
const s3 = new AWS.S3()

const mdbuild = require('woola')
const getConfig = require('./node_modules/woola/lib/appconfig.js')

const ghtoken = process.env.GITHUB_ACCESS_TOKEN
const localStore = path.resolve('./tmp')
// const globPattern = '**/*'

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
    CacheControl: 'max-age=86400'
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



// const uploadStream = (file,s3bucket,srcPath='.') => new Promise((resolve, reject) => {
//   const fileStream = fs.createReadStream(path.join(path.resolve(srcPath),file))
//   fileStream.on('error', function(err) {
//     console.log('File Error', err)
//   })

//   const uploadParams = {
//     Bucket: s3bucket,
//     Body: fileStream,
//     Key: file, 
//     ContentType: computeContentType(file),
//     CacheControl: 'max-age=86400'
//   }

//   s3.upload (uploadParams, function (err, data) {
//     if (err) {
//       console.log("Error", err)
//       reject(err)
//     } if (data) {
//       console.log("Upload Success", data.Location)
//       resolve(data)
//     }
//   })
// })






console.log('Loading lambdaBuildBot, current dir: ' + process.cwd())

exports.handler = function (event, context) {
  // console.log('Received event:', JSON.stringify(event, null, 2))
  const message = event.Records[0].Sns.Message
  const mobj = JSON.parse(message)
  const archiveURL = mobj.repository.archive_url.replace('{archive_format}{/ref}','tarball/master')
  const repoDirname = localStore + '/' + mobj.repository.full_name.replace('/','-') + '-' + mobj.head_commit.id
  const site = getConfig({config: repoDirname + '/config.js'})
  site.options.srcPath = repoDirname //source directory
  site.options.dstPath = localStore + '/dist' // destination directory for the distribution
  site.options.globPattern = '**/*'

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


  // const getBuild = () => new Promise((resolve) => {
  //   const out = mdbuild(site)
  //   resolve(out)
  // })

  // function getBuild (site, globPattern, callback) {
  //   // mdbuild(site)
  //   const out = mdbuild(site)
  //   console.log('here:' + out)
  //   setTimeout(() => {
  //     callback(globPattern, {cwd: site.options.dstPath, nodir: true},out)  
  //   }, 500)
  // }

  // function getBuild() {
  //   return new Promise((resolve,reject) => {
  //     const out = mdbuild(site)
  //     console.log(out)
  //     resolve(out)
  //   })
  // }


  // const handleFiles = (files, site) => {
  //   files.forEach(file => {
  //     // console.log(file)
  //     uploadStream(file, site.s3_bucket, site.options.dstPath)
  //   })
  // }

  // const globOptions = {cwd: site.options.dstPath, nodir: true}

  // const readdir = () => new Promise((resolve, reject) => {
  //   glob(globPattern, globOptions, (err, files) => {
  //     if (err) reject(err)
  //     else resolve(files)
  //   })
  // })


  function readdir (site,callback) {
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
    files.forEach(file => {
      uploadStream(file, site.s3_bucket, site.options.dstPath)
    })
  }


  // const readdir = () => new Promise((resolve, reject) => {
  //     fs.readdir(site.options.dstPath, (err, files) => {
  //         if (err) reject(err)
  //         else resolve(files)
  //     })
  // })


  // const buildDataArray = (site, files) => new Promise((resolve, reject) => {
  //   const promiseStack = []
  //   // create promise array
  //   files.forEach(file => promiseStack.push(
  //     uploadStream(file, site.s3_bucket, site.options.dstPath)
  //   ))
  //   //ext html needed in dataout.obj
  //   Promise.all(promiseStack).then(resultObj => {
  //     resolve(resultObj)})
  // })


  const mylog = (files) => {
    console.log('files: ' + files)
  }

  const build = function () {
    console.log(`'Saving: '${repoDirname}`)
    if (fs.existsSync(repoDirname)) {
      // console.log(repoDirname + ' exists!')
      // getBuild()
      // readdir()
      // .then(mylog)
      // .catch (err => { console.log(err) })

      // .then( files => { console.log(files) })
      // .catch (err => { console.log(err) })


      // getBuild(site)
      // .then( () => { return readdir(globPattern, {cwd: site.options.dstPath, nodir: true}) })
      // .then( files => { return console.log(files) })
      // .catch (err => { console.log(err) })

      // getBuild(site, globPattern, readdir)
      // mdbuild(site,readdir)
      // console.log(fnms)

      mdbuild(site,() => {
        readdir(site, uploadFiles)
      })


      // .then(files => { return buildDataArray(files,site) })
      // .then(resultsArray => { return console.log(resultsArray) })
      // .catch (err => { console.log(err) })

      // .then(files => { return handleFiles(files, site) })
      // .catch (err => { console.log(err) })

      // callback(null, {'message': `more success`})
    } else {
      console.log(repoDirname + ' does not exist')
    }  
  }
  
  // stream
  //   .pipe(gunzip)
  //   .pipe(tar.extract(localStore))
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
