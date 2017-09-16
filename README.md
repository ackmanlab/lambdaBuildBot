---
date: 2017-09-15 13:05:40  
title: lambdaBuildBot
author: James Ackman  
---

lambdaBuildBot– A serverless build and deploy bot for site content.

The idea is that upon commiting content changes to a project, the remote push/synchronization with a master branch of its github repo triggers this bot to build a project and deploy it for you. 

Currently it is configured to use AWS Lambda and deploy to an S3 bucket, but since the main code is all standard nodejs javascript, one could presumably configure a version compatible with other cloud services (Microsoft Azure, Google, IBM Openwhisk, etc). Installation pulls in woola to use as the javascript markdown/html build tool. 


## Installation

Have node/npm installed on your local machine then:  

    npm install https://github.com/ackmanlab/lambdaBuildBot.git


## Testing

For testing on your local machine, [node-lambda](https://www.npmjs.com/package/node-lambda) is a useful dependency for development. Just follow its directions for making a .env file in your lambdaBuildBot directory and set up keys/values for AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, GITHUB_ACCESS_TOKEN, as well as LOCAL_DIR (`LOCAL_DIR=./tmp`).

For AWS:

1. Get an AWS account setup and S3 bucket configured (see Amazon documentation).
2. Get a github access token.
3. Create a lambda function with the name lambdaBuildBot. 
    * set the function up with at least 1024 MB memory so it will run fastest (cpu speed is tied to memory request requirement for lambda).
    * set a GITHUB_ACCESS_TOKEN environment variable.
4. Update function... if you have make a file called 'deploy.sh' with the following contents in your lambdaBuildBot directory and you have aws-cli installed then you can just run `npm deploy`:  


```bash
#!/bin/bash
awsRegion='' #'us-west-2'
awsAccountNumber='' #'xxxxxxxxxxxx'
filepath=$(pwd)
fname='lambdaBuildBot'
zip -r $fname.zip index.js node_modules
aws lambda update-function-code \
--function-name arn:aws:lambda:$awsRegion:$awsAccountNumber:function:$fname \
--zip-file fileb://$filepath/$fname.zip

```

With this workflow you can go from a project update in a git repository on a local computer to a completely rebuilt live static site accessible anywhere in the world within 2-4 s (with a cold invocation, repeated hot invocations would be even faster) giving rise to the possibility for fast asynchronous collaborative updates of complex apps.


MIT License