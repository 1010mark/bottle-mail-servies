var gulp = require('gulp');
var sass = require('gulp-sass');

gulp.task('complie-scss', function(){
  return gulp.src('scss/**/*.scss')
    .pipe(sass())
    .pipe(gulp.dest('views'));
});

gulp.task('default', gulp.series('complie-scss', function(){
  gulp.watch(`scss/**/*.scss`, gulp.series('complie-scss', done => done()));
}));