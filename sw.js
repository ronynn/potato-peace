var GHPATH = '/potato-peace';
var APP_PREFIX = 'peace_';
var VERSION = 'version_0.08';
var URLS = [    
  `${GHPATH}/`,
  `${GHPATH}/index.html`,
 `${GHPATH}/index.html`,
`${GHPATH}/mainfest.json`,
`${GHPATH}/script.js`,
`${GHPATH}/vn-runner.js`,
`${GHPATH}/ink.js`,
`${GHPATH}/story.js`,
`${GHPATH}/style.css`,
`${GHPATH}/img/about.png`,
`${GHPATH}/img/ceremony.png`,
`${GHPATH}/img/cover.png`,
`${GHPATH}/img/father.png`,
`${GHPATH}/img/mayor.png`,
`${GHPATH}/img/mc.png`,
`${GHPATH}/img/mc2.png`,
`${GHPATH}/img/mc3.png`,
`${GHPATH}/img/museum.png`,
`${GHPATH}/img/office.png`,
`${GHPATH}/img/restart.png`,
`${GHPATH}/img/save.png`,
`${GHPATH}/img/sculptor.png`,
`${GHPATH}/img/statue.png`,
`${GHPATH}/img/theme.png`,
`${GHPATH}/img/town.png`,
`${GHPATH}/img/woods.png`,
]

var CACHE_NAME = APP_PREFIX + VERSION
self.addEventListener('fetch', function (e) {
  console.log('Fetch request : ' + e.request.url);
  e.respondWith(
    caches.match(e.request).then(function (request) {
      if (request) { 
        console.log('Responding with cache : ' + e.request.url);
        return request
      } else {       
        console.log('File is not cached, fetching : ' + e.request.url);
        return fetch(e.request)
      }
    })
  )
})

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.log('Installing cache : ' + CACHE_NAME);
      return cache.addAll(URLS)
    })
  )
})

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keyList) {
      var cacheWhitelist = keyList.filter(function (key) {
        return key.indexOf(APP_PREFIX)
      })
      cacheWhitelist.push(CACHE_NAME);
      return Promise.all(keyList.map(function (key, i) {
        if (cacheWhitelist.indexOf(key) === -1) {
          console.log('Deleting cache : ' + keyList[i] );
          return caches.delete(keyList[i])
        }
      }))
    })
  )
})