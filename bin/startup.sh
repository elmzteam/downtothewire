pushd .
if [ ! -e "startup.sh" ]; then
	cd ..
fi

if [ ! -e "startup.sh" ]; then
	echo "Please run from the project directory"
	popd
	exit -1
fi

mkdir build
mkdir posts
mkdir render
