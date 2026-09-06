FROM postgres:15-alpine AS patched

# 容器直接以 postgres 用户运行，不需要 root 启动路径使用的 gosu。
# 基础镜像由 deploy.sh --pull 刷新，构建不再依赖 Alpine 软件仓库。
RUN rm -f /usr/local/bin/gosu

# 复制当前文件系统到干净运行阶段，避免扫描器把已删除的旧 gosu 构建层
# 误识别为运行时组件；运行元数据只保留数据库真正需要的部分。
FROM scratch

COPY --from=patched / /

ENV PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ENV LANG=en_US.utf8
ENV PGDATA=/var/lib/postgresql/data

USER postgres

VOLUME /var/lib/postgresql/data
ENTRYPOINT ["docker-entrypoint.sh"]
STOPSIGNAL SIGINT
EXPOSE 5432
CMD ["postgres"]
