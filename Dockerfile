# Используем официальный образ Ubuntu с компилятором
FROM ubuntu:22.04 AS builder

# Устанавливаем зависимости для сборки
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем vcpkg
WORKDIR /opt
RUN git clone https://github.com/microsoft/vcpkg.git && \
    cd vcpkg && \
    ./bootstrap-vcpkg.sh

# Копируем исходники
WORKDIR /app
COPY . .

# Собираем проект
RUN cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE=/opt/vcpkg/scripts/buildsystems/vcpkg.cmake && \
    cmake --build build

# Финальный образ (минимальный)
FROM ubuntu:22.04

# Устанавливаем только необходимые библиотеки для запуска
RUN apt-get update && apt-get install -y \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

# Копируем бинарник и данные
WORKDIR /app
COPY --from=builder /app/build/portfolio_server .
COPY --from=builder /app/data ./data

# Открываем порт
EXPOSE 8080

# Запускаем сервер
CMD ["./portfolio_server"]