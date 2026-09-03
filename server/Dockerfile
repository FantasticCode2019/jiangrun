FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/server .
COPY --from=builder /app/config ./config

# 创建必要的目录
RUN mkdir -p /app/logs /app/uploads/images /app/uploads/videos

EXPOSE 8080

CMD ["./server"]
