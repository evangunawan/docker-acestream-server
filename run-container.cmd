SET SERVER_HTTP_PORT="6878"
SET DOCKER_REPOSITORY="magnetikonline/acestream-server"
SET ACE_STREAM_VERSION="3.1.49_debian_8.11"

docker run -d --publish %SERVER_HTTP_PORT%:%SERVER_HTTP_PORT% --rm --tmpfs "/dev/disk/by-id:noexec,rw,size=4k" %DOCKER_REPOSITORY%:%ACE_STREAM_VERSION%
