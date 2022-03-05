#!/usr/bin/env sh

cd $(dirname $0)/..

mkdir -p artifacts/deploy/

curl -L https://github.com/TribecaHQ/tribeca/releases/download/v0.5.4/locked_voter.so > \
    artifacts/deploy/locked_voter.so

curl -L https://github.com/TribecaHQ/tribeca/releases/download/v0.5.4/govern.so > \
    artifacts/deploy/govern.so

curl -L https://github.com/GokiProtocol/goki/releases/download/v0.8.0/smart_wallet.so > \
    artifacts/deploy/smart_wallet.so
