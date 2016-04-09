pushd .
if [ ! -e "package.json" ]; then
	cd ..
fi

if [ ! -e "package.json" ]; then
	cd $@
fi

if [ ! -e "package.json" ]; then
	echo "Please run from the project directory"
	popd
	exit -1
fi

mkdir build
mkdir posts
mkdir render

node_modules/gulp/bin/gulp.js build

popd
