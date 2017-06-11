# dttw (Down to the Wire)
Blog platform for Down to the Wire. Current version is hosted at [dttw.tech](https://dttw.tech). 
Plans have also been made to abstract the source and provide it as an OSS blogging platform based off node and express.

## Execution
The recommended stack for running dttw is to use `forever` to daemonize the process, `mongod` in the background to serve requests, and `nginx` in the front to serve as a reverse proxy for it.
