.PHONY: docs osx windows linux

default: osx windows linux
	@true

clean: clean-osx clean-windows clean-linux
	@true

osx: clean-osx
	./script/build-osx

windows: clean-windows
	./script/build-windows

linux: clean-linux
	./script/build-linux

clean-osx:
	rm -f dist/*.dmg

clean-windows:
	rm -f dist/*.exe

clean-linux:
	rm -f dist/*.deb && rm -f dist/*.rpm
