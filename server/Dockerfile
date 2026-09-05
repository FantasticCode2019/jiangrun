FROM golang:1.26.8-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

FROM alpine:3.24

WORKDIR /app

COPY --from=builder /app/server .
COPY --from=builder /app/config ./config

# 固定非 root UID；新数据卷会继承目录所有权。
RUN apk upgrade --no-cache \
  && apk add --no-cache ca-certificates \
  && addgroup -S -g 10001 app && adduser -S -D -H -u 10001 -G app app \
  && mkdir -p /app/uploads/images /app/uploads/videos /app/uploads/tmp \
  && chown -R app:app /app

USER app

EXPOSE 8080

CMD ["./server"]
