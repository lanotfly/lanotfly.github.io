---
layout: post
title:  "Sync with upstream repo"
date:   2018-12-07 17:10:26 +0900
categories: jekyll page
---
#### git sync from upstream
~~~~
git remote add upstream https://github.com/some_user/some_repo
git fetch upstream
git checkout master
git reset --hard upstream/master  
git push origin master --force
~~~~