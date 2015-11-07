var gulp = require('gulp');
var karma = require('karma');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var $ = require('gulp-load-plugins')();
var jsFiles = [
  'src/*.js',
  'test/*.js'
];

gulp.task('jscs', function () {
  gulp
    .src(jsFiles)
    .pipe($.jscs());
});

gulp.task('jshint', function () {
  gulp
    .src(jsFiles)
    .pipe($.jshint('.jshintrc'))
    .pipe($.jshint.reporter('jshint-stylish'));
});

gulp.task('karma', function (done) {
  new karma.Server({
    configFile : __dirname + '/karma.conf.js',
    singleRun : true
  }, done).start();
});

gulp.task('build', function () {
  var b = browserify({
    entries : './src/lala-web-sql.js',
    standalone : 'LalaWebSQL'
  });

  return b.bundle()
    .pipe(source('lala-web-sql.js'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('check', ['jscs', 'jshint', 'karma']);

