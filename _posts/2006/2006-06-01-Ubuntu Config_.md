---
layout: post
title:  "Ubuntu Config"
date:   2006-06-01 15:10:26 +0900
categories: jekyll page
---
~~~~
reference site
https://gorails.com/setup/ubuntu/14.04
~~~~

### Ruby
~~~~
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list

sudo apt-get update
sudo apt-get install git-core curl zlib1g-dev build-essential libssl-dev libreadline-dev libyaml-dev libsqlite3-dev sqlite3 libxml2-dev libxslt1-dev libcurl4-openssl-dev software-properties-common libffi-dev nodejs yarn

cd
git clone https://github.com/rbenv/rbenv.git ~/.rbenv
echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(rbenv init -)"' >> ~/.bashrc
exec $SHELL

git clone https://github.com/rbenv/ruby-build.git ~/.rbenv/plugins/ruby-build
echo 'export PATH="$HOME/.rbenv/plugins/ruby-build/bin:$PATH"' >> ~/.bashrc
exec $SHELL

rbenv install 2.6.1
rbenv global 2.6.1
ruby -v

gem install bundler
~~~~

### JDK8
~~~~
sudo add-apt-repository ppa:webupd8team/java
sudo apt-get update
sudo apt-get install oracle-java8-installer
sudo apt-get install oracle-java8-set-default
~~~~

### phpmyadmin
~~~~
sudo ln -s /usr/share/phpmyadmin /var/www/html/phpmyadmin
~~~~

### jekyll
~~~~
gem install bundler jekyll

jekyll new my-awesome-site

cd my-awesome-site

bundle install

bundle exec jekyll serve --host 0.0.0.0 --port 80
~~~~

### webmin
~~~~
rm /etc/apt/apt.conf.d/docker-gzip-indexes
apt-get purge apt-show-versions
rm /var/lib/apt/lists/*lz4
apt-get -o Acquire::GzipIndexes=false update
apt-get install apt-show-versions

sudo apt install python apt-show-versions libapt-pkg-perl libauthen-pam-perl libio-pty-perl libnet-ssleay-perl
cd /tmp && curl -L -O http://www.webmin.com/download/deb/webmin-current.deb
sudo dpkg -i webmin-current.deb
sudo nano /etc/webmin/miniserv.conf

curl -O http://software.virtualmin.com/gpl/scripts/install.sh
sudo chmod +x install.sh
sudo ./install.sh

/usr/share/webmin/changepass.pl /etc/webmin admin newpassword
~~~~