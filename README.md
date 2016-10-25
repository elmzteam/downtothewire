# bydesign (Down to the Wire)
Blog Platform for Down to the Wire. Current version is hosted at [dttw.tech](http://dttw.tech), but will eventually be moved to a DttW themed url. 
Plans have also been made to abstract the source and provide it as an OSS blogging platform based off node and express.

## Execution
The recommended stack for running bydesign is to use `forever` to daemonize the process, `mongod` in the background to serve requests, and `nginx` in the front to serve as a reverse proxy for it.
