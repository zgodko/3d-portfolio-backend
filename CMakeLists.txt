cmake_minimum_required(VERSION 3.20)
project(3d_portfolio_backend VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Добавляем исполняемый файл
add_executable(portfolio_server src/main.cpp)

# Подключаем папку third_party для заголовков
target_include_directories(portfolio_server PRIVATE ${CMAKE_SOURCE_DIR}/third_party)

# Для Windows — подключаем Winsock
if(WIN32)
    target_link_libraries(portfolio_server PRIVATE ws2_32)
endif()

# Для Linux — подключаем pthread (нужно для cpp-httplib)
if(UNIX AND NOT APPLE)
    target_link_libraries(portfolio_server PRIVATE pthread)
endif()

# Предупреждения компилятора
if(MSVC)
    target_compile_options(portfolio_server PRIVATE /W4)
else()
    target_compile_options(portfolio_server PRIVATE -Wall -Wextra -Wpedantic)
endif()