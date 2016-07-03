export DIR=`pwd`

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

if [ ! -e ".init" ]; then
	touch .init

	mkdir build
	mkdir posts
	mkdir render

	echo "db.createCollection('users')" | mongo bydesign
	echo "db.createCollection('docs')"  | mongo bydesign
	echo "db.createCollection('posts')" | mongo bydesign
fi

cd $DIR
