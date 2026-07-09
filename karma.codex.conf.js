const path = require('path');

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      clearContext: false,
      jasmine: {
        random: false,
      },
    },
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: path.join(__dirname, './coverage'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcovonly', file: 'lcov.info' },
      ],
    },
    reporters: ['progress'],
    hostname: '127.0.0.1',
    listenAddress: '127.0.0.1',
    port: 9877,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    customLaunchers: {
      ChromeHeadlessCodex: {
        base: 'ChromeHeadless',
        flags: [
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-dev-shm-usage',
          '--disable-renderer-backgrounding',
          '--js-flags=--expose-gc',
          '--no-sandbox',
        ],
      },
    },
    browsers: ['ChromeHeadlessCodex'],
    browserDisconnectTimeout: 30000,
    browserDisconnectTolerance: 3,
    browserNoActivityTimeout: 120000,
    captureTimeout: 180000,
    singleRun: true,
    restartOnFileChange: false,
  });
};
