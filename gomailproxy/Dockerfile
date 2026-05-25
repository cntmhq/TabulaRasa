# syntax=docker/dockerfile:1.7

# --- Build stage --------------------------------------------------------------
FROM golang:1.25-alpine AS build

WORKDIR /src

# Pure-Go sqlite driver (glebarez/sqlite) means CGO_ENABLED=0 is safe.
ENV CGO_ENABLED=0 \
    GOOS=linux \
    GOFLAGS=-trimpath

# Cache module downloads.
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -ldflags="-s -w" -o /out/gomailproxy ./

# Pre-create the data dir with nonroot ownership; distroless has no shell to do this at runtime.
RUN mkdir -p /out/data && chown -R 65532:65532 /out/data

# --- Runtime stage ------------------------------------------------------------
FROM gcr.io/distroless/static-debian12:nonroot AS runtime

WORKDIR /app

COPY --from=build /out/gomailproxy /app/gomailproxy
COPY --from=build --chown=65532:65532 /out/data /data

# SQLite DB lives under /data; mount a volume here in production.
# Distroless `nonroot` is uid/gid 65532.
ENV DATABASE_PATH=/data/gomailproxy.db \
    LISTEN_ADDR=:8080

VOLUME ["/data"]
EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT ["/app/gomailproxy"]
