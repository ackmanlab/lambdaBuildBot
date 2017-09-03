const request = require('request')
const fs = require('fs')
const tar = require('tar-fs')
const zlib = require('zlib')
const gunzip = zlib.createGunzip()
const ghtoken = process.env.GITHUB_ACCESS_TOKEN
// const config = require('./config.json')
console.log('Loading GitHubBot')

exports.handler = (event, context, callback) => {
  // console.log('Received event:', JSON.stringify(event, null, 2))
  const message = event.Records[0].Sns.Message
  const mobj = JSON.parse(message)
  // console.log(mobj.repository.archive_url)
  // callback(null, message)
  const archiveURL = mobj.repository.archive_url.replace('{archive_format}{/ref}','tarball/master')

  const reqOptions = {
    url: archiveURL,
    headers: {
      'Authorization': 'token ' + ghtoken,
      'User-Agent': 'ghlambdabot'
    } 
  }
  console.log(`'Requesting: '${archiveURL}`)

  request(reqOptions, (error, response, body) => {
    if (error) {
        callback(error);
      } else if (response && response.statusCode && !response.statusCode.toString().startsWith('2')) {
        callback(new Error(`GitHub API request failed with status ${response.statusCode}`));
      } else {
        callback(null, {'message': `success`});
      }
  })
  .pipe(gunzip).pipe(tar.extract('./tmp'))
}



  // function callback(error, response, body) {
  //   if (error) {
  //      console.log(`GitHub API request failed with status ${response.statusCode}`) 
  //   } else {
  //     // var info = JSON.parse(body)
  //     console.log(`success: ${response.statusCode}`)
  //     // console.log(info)
  //   }
  // }

  // function callback(error, response, body) {
  //   if (!error && response.statusCode == 200) {
  //     // var info = JSON.parse(body);
  //     // console.log(info)
  //     // console.log(info.stargazers_count + " Stars");
  //     // console.log(info.forks_count + " Forks");
  //     // console.log(info.forks_count + " Forks");
  //     // console.log(info.archive_url)
  //     console.log('success...')
  //   } else {
  //     console.log(response.statusCode)
  //   }
  // }

  // request(reqOptions, (error, response, body) => {
  //   if (error) {
  //       callback(error);
  //     } else if (response && response.statusCode && !response.statusCode.toString().startsWith('2')) {
  //       callback(new Error(`GitHub API request failed with status ${response.statusCode}`));
  //     } else {
  //       callback(null, {'message': `success`});
  //     }
  // })
  // .pipe(gunzip).pipe(tar.extract('./tmp'))
  // .pipe(fs.createWriteStream('archive2'))



  // request({
  //   json: true,
  //   headers: {
  //     'Authorization': 'token ' + ghtoken,
  //     'User-Agent': 'ackman678'
  //   },
  //   method: 'GET',
  //   url: myurl
  // }, (error, response, body) => {
  //   if (error) {
  //     callback(error);
  //   } else if (response && response.statusCode && !response.statusCode.toString().startsWith('2')) {
  //     callback(new Error(`GitHub API request failed with status ${response.statusCode}`));
  //   } else {
  //     callback(null, {'message': `success`});
  //   }
  // });

	// } else {
	// 	callback("error: ", null);
	// }


// const getURL = () => ({
//   url: myurl,
//   method: 'GET'
// });



// const githubRequest = (opts, token = ghtoken) => new Promise((resolve, reject) => {
//   // merge the standard set of HTTP request options
//   const mergedOptions = Object.assign({}, {
//     json: true,
//     headers: {
//       'Authorization': 'token ' + token,
//       'User-Agent': 'github-cla-bot'
//     },
//     method: 'POST'
//   }, opts);

//   // perform the request
//   console.log('GitHub API Request', opts.url);
//   request(mergedOptions, (error, response, body) => {
//     if (error) {
//       reject(error.toString());
//     } else if (response && response.statusCode && !response.statusCode.toString().startsWith('2')) {
//       reject(new Error('GitHub API request failed with status ' + response.statusCode));
//     } else {
//       resolve(body);
//     }
//   });
// });
