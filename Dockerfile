# Этап 1: Сборка
FROM ubuntu:22.04 AS builder

# Устанавливаем компилятор и CMake
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Рабочая папка
WORKDIR /app

# Копируем исходники и библиотеки
COPY src/ ./src/
COPY third_party/ ./third_party/
COPY data/ ./data/
COPY CMakeLists.txt ./

# Собираем проект
RUN cmake -B build -S . -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build

# Этап 2: Минимальный образ для запуска
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем только бинарник и данные
COPY --from=builder /app/build/portfolio_server .
COPY --from=builder /app/data ./data

EXPOSE 8080

CMD ["./portfolio_server"]