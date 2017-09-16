---
date: 2017-09-08 00:41:47  
author: James B. Ackman  
build: none  
index: false  
categories: public  
---

This repository includes the main ackmanlab site content.

Pushing to the master branch of this repository will trigger a custom build and deploy AWS lambda function for the site using a GitHub webhook linked to an AWS Simple Notification Service (SNS) topic.

Please feel free to edit and contribute! This can be done by cloning this repo locally and then pushing to the 'dev' branch or through pull requests and issues.

New pages and posts can be created simply by adding a markdown `.md` text file or an `.html` file in the src directory with date, author, title, layout, and categories metadata enclosed by `---` *yaml* block at the top of the file. e.g.

```
---
date: 2017-09-13 13:53:20  
title: My awesome post  
categories: local  
layout: post  
author: Foo Bar  
---

some content...

```




All non-code content is released under a Creative Commons Attribution 4.0 International License unless otherwise noted. All code content is released under an MIT License unless otherwise noted.

<!-- Pull this repo locally. Add markdown notes and commit them, then push back to github. The configured webhook service for the repo will automatically send an announcement to an AWS Simple Notification Service (SNS) topic which in turn is configured to trigger a AWS Lambda function.  -->
