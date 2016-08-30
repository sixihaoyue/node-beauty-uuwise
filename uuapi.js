'use strict';
let crypto = require('crypto'), _ = require('lodash'),
    Promise = require('bluebird'), fs = require('fs'),
    request = Promise.promisifyAll(require('request'));
let funMd5 = (content) => crypto.createHash('md5').update(content).digest('hex').toUpperCase();
let funGetUuUrl = (url, postData, closeUrl) => {
  var headers = {
    'Accept': 'text/html: application/xhtml+xml: */*',
    'Accept-Language': 'zh-cn',
    'Connection': 'Keep-Alive',
    'Cache-Control': 'no-cache',
    'SID': self.softID,
    'HASH': self.uhash,
    'UUVersion': self.uuVersion,
    'UID': self.uid,
    'User-Agent': self.userAgent,
    'KEY': self.gkey
  };
  if (_.isObject(postData)) {
    if (_.has(postData, 'img')) {
      headers['Content-Type'] = 'image/*';
      postData.img = fs.createReadStream(postData.img);
      return request.postAsync({url: url, headers: headers, formData: postData});
    }
    return request.postAsync({url: url, headers: headers, form: postData});
  }
  return request.getAsync({url: url, headers: headers});
};
let funGetServerUrl = (server) => {
  return funGetUuUrl('http://common.taskok.com:9000/Service/ServerConfig.aspx', null, false).then(function(response) {
    var arr = response.body;
    if (_.isEmpty(arr)) {
      throw new Error('[getServerUrl] -1001');
    }
    arr = arr.split(',');
    if (server === 'service') {
      return 'http://' + arr[1].substring(0, arr[1].lastIndexOf(':'));
    } else if (server === 'upload') {
      return 'http://' + arr[2].substring(0, arr[2].lastIndexOf(':'));
    } else if (server === 'code') {
      return 'http://' + arr[3].substring(0, arr[3].lastIndexOf(':'));
    } else {
      throw new Error('[getServerUrl] parameter error');
    }
  });
};
let funUpload = (imagePath, codeType, auth) => {
  return new Promise(function(resolve, reject) {
    if (!fs.existsSync(imagePath)) {
      throw new Error('[upload] imagePath [' + imagePath +'] is not exists');
    }
    funGetServerUrl('upload')
    .then(function(url) {
      var postData = {
        'key': self.userKey,
        'sid': self.softID,
        'skey': self.softContentKEY,
        'TimeOut': self.timeOut,
        'Type': codeType,
        'Version': auth ? '100' : '',
        'img': imagePath
      };
      return funGetUuUrl(url + '/Upload/Processing.aspx?R='+ _.now(), postData, false)
    })
    .then(function(response) {
      return resolve(response.body);
    })
    .catch(function(e) {
      return reject(e);
    });
  });
};
let funGetResult = (codeID) => {
  return new Promise((resolve, reject) => {
    funGetServerUrl('code')
    .then((url) => {
      var _funGetCode = () => {
        funGetUuUrl(url + '/Upload/GetResult.aspx?KEY=' + self.userKey + '&ID=' + codeID + '&Random=' + _.now())
        .then((response) => {
          if (response.body == '-3') {
            _.delay(_funGetCode, 500);
          } else {
            return resolve(response.body);
          }
        });
      };
      _funGetCode();
    })
    .catch(function(e) {
      return reject(e);
    });
  });
};
function UuApi() {
  var self = this;
  self.softID = ''; self.softKEY = '';
  self.userName = ''; self.userPassword = ''; self.uid = '100';
  self.userKey = ''; self.softContentKEY = '';
  self.uuUrl = ''; self.uhash = '';
  self.uuVersion = '1.1.0.1'; self.macAddress = '00e021ac7d';
  self.timeOut = 60000; self.userAgent = ''; self.gkey = '';
  return {
    setSoftInfo: (id, key) => {
      self.softID = id;
      self.softKEY = key;
      self.uhash = funMd5(id + key.toUpperCase());
    },
    userLogin: (userName, passWord) => {
      return new Promise((resolve, reject) => {
        if (_.isEmpty(self.softID) || _.isEmpty(self.softKEY)) {
          throw new Error('[userLogin] sorry,SoftID or softKey is not set! Please use the setSoftInfo(id,key) function to set!');
        }
        if (_.isEmpty(userName) || _.isEmpty(passWord)) {
          throw new Error('[userLogin] userName or passWord is empty!');
        }
        self.userName = userName;
        self.userPassword = passWord;
        self.userAgent = funMd5(self.softKEY.toUpperCase() + self.userName.toUpperCase()) + self.macAddress;
        funGetServerUrl('service')
        .then((url) => funGetUuUrl(url + '/Upload/Login.aspx?U=' + userName + '&P=' + funMd5(passWord) + '&R=' + _.now(), null, false))
        .then(function(response) {
          if (!_.isEmpty(response.body)) {
            self.userKey = response.body;
            self.uid = self.userKey.split('_')[0];
            self.softContentKEY = funMd5((self.userKey + self.softID + self.softKEY).toLowerCase());
            self.gkey = funMd5((self.softKEY + self.userName).toUpperCase()) + self.macAddress;
          }
          return resolve(self.uid);
        }).catch((e) => reject(e));
      });
    },
    getPoint: function() {
      return new Promise(function(resolve, reject) {
        if (_.isEmpty(self.userName) || _.isEmpty(self.userPassword)) {
          throw new Error('[getPoint] userName or passWord is empty!');
        }
        funGetServerUrl('service')
        .then((url) => funGetUuUrl(url + '/Upload/GetScore.aspx?U=' + self.userName + '&P=' + funMd5(self.userPassword) + '&R=' + _.now(), null, false))
        .then((response) => resolve(response.body))
        .catch((e) => reject(e));
      });
    },
    autoRecognition: function(imagePath, codeType) {
      return new Promise(function(resolve, reject) {
        funUpload(imagePath, codeType, true).then(function(codeID) {
          if (_.indexOf(codeID, '|') > -1) {
            return resolve(_.split(codeID, '|')[1]);
          } else {
            funGetResult(codeID).then((code) => resolve(code));
          }
        }).catch((e) => reject(e));
      });
    },
    upload: funUpload,
    getResult: funGetResult,
  }
};
module.exports = new UuApi();
