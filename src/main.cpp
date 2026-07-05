#include "httplib.h"
#include "json.hpp"
#include <iostream>
#include <fstream>
#include <string>

using json = nlohmann::json;

// Функция для чтения JSON файла
json loadModelsFromFile(const std::string& filename) {
    std::ifstream file(filename);
    if (!file.is_open()) {
        std::cerr << "Error: Could not open file " << filename << std::endl;
        return json::object();
    }
    
    json data;
    try {
        file >> data;
    } catch (const json::parse_error& e) {
        std::cerr << "Error: JSON parse error in " << filename << ": " << e.what() << std::endl;
        return json::object();
    }
    
    return data;
}

// Функция для добавления CORS заголовков
void setCORSHeaders(httplib::Response& res) {
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type");
}

int main() {
    // Загружаем данные из файла при старте
    std::cout << "Loading models data..." << std::endl;
    json modelsData = loadModelsFromFile("data/models.json");
    
    if (modelsData.empty()) {
        std::cerr << "Error: Failed to load models data. Server will start with empty data." << std::endl;
    } else {
        std::cout << "Loaded " << modelsData["models"].size() << " models" << std::endl;
    }
    
    httplib::Server svr;
    
    // Pre-routing handler для CORS (обрабатывает OPTIONS запросы)
    svr.Options("(.*)", [](const httplib::Request&, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
        res.status = 204;
    });
    
    // Эндпоинт: GET /api/models - список всех моделей
    svr.Get("/api/models", [&modelsData](const httplib::Request&, httplib::Response& res) {
        if (modelsData.empty() || !modelsData.contains("models")) {
            res.status = 500;
            res.set_content(R"({"error":"Failed to load models data"})", "application/json; charset=utf-8");
            setCORSHeaders(res);
            return;
        }
        
        // Возвращаем только краткую информацию (ModelSummary)
        json summaryList = json::array();
        for (const auto& model : modelsData["models"]) {
            json summary = {
                {"id", model.value("id", json())},
                {"name", model.value("name", "")},
                {"preview_image_url", model.value("preview_image_url", "")},
                {"category", model.value("category", "")},
                {"created_at", model.value("created_at", "")}
            };
            summaryList.push_back(summary);
        }
        
        res.set_content(summaryList.dump(2), "application/json; charset=utf-8");
        setCORSHeaders(res);
    });
    
    // Эндпоинт: GET /api/models/:id - детали конкретной модели
    svr.Get(R"(/api/models/([^/]+))", [&modelsData](const httplib::Request& req, httplib::Response& res) {
        std::string modelIdStr = req.matches[1];
        
        if (modelsData.empty() || !modelsData.contains("models")) {
            res.status = 500;
            res.set_content(R"({"error":"Failed to load models data"})", "application/json; charset=utf-8");
            setCORSHeaders(res);
            return;
        }
        
        // Пытаемся преобразовать ID в число для сравнения
        int modelIdNum = 0;
        bool isNumericId = true;
        try {
            modelIdNum = std::stoi(modelIdStr);
        } catch (...) {
            isNumericId = false;
        }
        
        // Ищем модель по ID
        for (const auto& model : modelsData["models"]) {
            json idField = model.value("id", json());
            
            // Проверяем, совпадает ли ID (поддерживаем и числовой, и строковый формат)
            bool idMatches = false;
            if (isNumericId && idField.is_number_integer()) {
                idMatches = (idField.get<int>() == modelIdNum);
            } else if (idField.is_string()) {
                idMatches = (idField.get<std::string>() == modelIdStr);
            }
            
            if (idMatches) {
                // Возвращаем полную информацию (ModelDetails)
                res.set_content(model.dump(2), "application/json; charset=utf-8");
                setCORSHeaders(res);
                return;
            }
        }
        
        // Модель не найдена
        res.status = 404;
        res.set_content(R"({"error":"Model not found"})", "application/json; charset=utf-8");
        setCORSHeaders(res);
    });
    
    // Старый эндпоинт для проверки
    svr.Get("/hello", [](const httplib::Request&, httplib::Response& res) {
        res.set_content("Hello from 3D Portfolio Backend!", "text/plain; charset=utf-8");
        setCORSHeaders(res);
    });
    
    std::cout << "Starting server on port 8080..." << std::endl;
    std::cout << "API endpoints:" << std::endl;
    std::cout << "  GET http://localhost:8080/api/models - list all models" << std::endl;
    std::cout << "  GET http://localhost:8080/api/models/{id} - get model details" << std::endl;
    std::cout << "  GET http://localhost:8080/hello - health check" << std::endl;
    std::cout << "CORS enabled for all origins" << std::endl;
    
    svr.listen("0.0.0.0", 8080);
    
    return 0;
}