FROM ubuntu:18.04

ARG ACE_STREAM_VERSION

WORKDIR /app

RUN apt update && apt upgrade -y
RUN apt install curl net-tools python3.7 libpython3.7 python3-pip -y

RUN curl --silent "https://download.acestream.media/linux/acestream_3.1.75rc4_ubuntu_18.04_x86_64_py3.7.tar.gz" | \
tar --extract --gzip

RUN python3.7 -m pip install --upgrade pip
RUN python3.7 -m pip install -r ./requirements.txt

EXPOSE 6878/tcp

# ENTRYPOINT []
ENTRYPOINT ["/app/start-engine"]
CMD ["--client-console"]
