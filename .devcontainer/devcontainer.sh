#!/usr/bin/env bash

set -euxo pipefail

DOCKER=$(which podman)

DEVCONTAINER_DIR=$(dirname $0)
WORKSPACE_FOLDER=$(dirname "${DEVCONTAINER_DIR}")

mkdir -p "${DEVCONTAINER_DIR}/run"

function cleanup()
{
    CONTAINER_ID=$(jq -r .containerId .devcontainer/run/up.json)
    $DOCKER rm -f "${CONTAINER_ID}"
    rm .devcontainer/run/* || true
}

trap cleanup EXIT

command="${@:-/bin/bash}"

if [ ! -f "$HISTORY_DIR/docker.bash" ]; then
    mkdir -p "$HISTORY_DIR"
    touch "$HISTORY_DIR/docker.bash"
fi

devcontainer --docker-path $DOCKER --workspace-folder "${WORKSPACE_FOLDER}" build | jq . > "${DEVCONTAINER_DIR}/run/build.json"
devcontainer --docker-path $DOCKER --workspace-folder "${WORKSPACE_FOLDER}" up | jq . > "${DEVCONTAINER_DIR}/run/up.json"
devcontainer exec --docker-path $DOCKER --workspace-folder "${WORKSPACE_FOLDER}" "$command"