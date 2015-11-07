module.exports = function(config) {
  config.set({
    frameworks : ['jasmine', 'browserify'],

    files : [
      'bower_components/underscore/underscore.js',
      'bower_components/rsvp/rsvp.js',
      'src/*.js',
      'test/*.spec.js'
    ],

    preprocessors : {
      'src/*.js' : ['browserify'],
      'test/*.js' : ['browserify']
    },

    browserify : {
      debug : false
    },

    reporters : ['mocha'],

    browsers : ['PhantomJS'],
  });
};

