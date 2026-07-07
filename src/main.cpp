#include <cstdlib>
#include <fstream>
#include <iostream>
#include <string>
#include <algorithm>

#include "httplib.h"
#include "json.hpp"

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
    std::cerr << "Error: JSON parse error in " << filename << ": " << e.what()
              << std::endl;
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
    std::cerr << "Error: Failed to load models data. Server will start "
                 "with empty data."
              << std::endl;
  } else {
    std::cout << "Loaded " << modelsData["models"].size() << " models"
              << std::endl;
  }

  httplib::Server svr;

  // Pre-routing handler для CORS
  svr.Options("(.*)", [](const httplib::Request&, httplib::Response& res) {
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type");
    res.status = 204;
  });

  // Эндпоинт: GET /api/models?page=1&limit=12 или ?search=текст
  svr.Get("/api/models", [&modelsData](const httplib::Request& req,
                                       httplib::Response& res) {
    if (modelsData.empty() || !modelsData.contains("models")) {
      res.status = 500;
      res.set_content(R"({"error":"Failed to load models data"})",
                      "application/json; charset=utf-8");
      setCORSHeaders(res);
      return;
    }

    // Проверяем, есть ли параметр поиска
    std::string searchQuery;
    if (req.has_param("search")) {
      searchQuery = req.get_param_value("search");
    }

    const auto& allModels = modelsData["models"];

    // Если есть поисковый запрос — фильтруем модели
    if (!searchQuery.empty()) {
      // Приводим поисковый запрос к нижнему регистру
      std::string searchLower = searchQuery;
      std::transform(searchLower.begin(), searchLower.end(),
                     searchLower.begin(), ::tolower);

      json filteredModels = json::array();

      for (const auto& model : allModels) {
        bool matches = false;

        // Поиск по названию (приоритет)
        std::string name = model.value("name", "");
        std::string nameLower = name;
        std::transform(nameLower.begin(), nameLower.end(), nameLower.begin(),
                       ::tolower);

        if (nameLower.find(searchLower) != std::string::npos) {
          matches = true;
        }

        // Поиск по тегам
        if (!matches && model.contains("tags") && model["tags"].is_array()) {
          for (const auto& tag : model["tags"]) {
            std::string tagStr = tag.get<std::string>();
            std::string tagLower = tagStr;
            std::transform(tagLower.begin(), tagLower.end(), tagLower.begin(),
                           ::tolower);

            if (tagLower.find(searchLower) != std::string::npos) {
              matches = true;
              break;
            }
          }
        }

        if (matches) {
          json summary = {
              {"id", model.value("id", json())},
              {"name", name},
              {"preview_image_url", model.value("preview_image_url", "")},
              {"category", model.value("category", "")},
              {"created_at", model.value("created_at", "")}};
          filteredModels.push_back(summary);
        }
      }

      // Возвращаем отфильтрованные модели (без пагинации)
      json response = {{"models", filteredModels},
                       {"total", filteredModels.size()},
                       {"search", searchQuery}};

      res.set_content(response.dump(2), "application/json; charset=utf-8");
      setCORSHeaders(res);
      return;
    }

    // Если нет поиска — обычная пагинация
    int page = 1;
    int limit = 12;

    if (req.has_param("page")) {
      try {
        page = std::stoi(req.get_param_value("page"));
        if (page < 1) page = 1;
      } catch (...) {
        page = 1;
      }
    }

    if (req.has_param("limit")) {
      try {
        limit = std::stoi(req.get_param_value("limit"));
        if (limit < 1) limit = 12;
        if (limit > 100) limit = 100;
      } catch (...) {
        limit = 12;
      }
    }

    int total = static_cast<int>(allModels.size());
    int totalPages = (total + limit - 1) / limit;

    int startIndex = (page - 1) * limit;
    int endIndex = std::min(startIndex + limit, total);

    json summaryList = json::array();
    if (startIndex < total) {
      for (int i = startIndex; i < endIndex; i++) {
        const auto& model = allModels[i];
        json summary = {
            {"id", model.value("id", json())},
            {"name", model.value("name", "")},
            {"preview_image_url", model.value("preview_image_url", "")},
            {"category", model.value("category", "")},
            {"created_at", model.value("created_at", "")}};
        summaryList.push_back(summary);
      }
    }

    json response = {{"models", summaryList},
                     {"total", total},
                     {"page", page},
                     {"limit", limit},
                     {"totalPages", totalPages}};

    res.set_content(response.dump(2), "application/json; charset=utf-8");
    setCORSHeaders(res);
  });

  // Эндпоинт: GET /api/models/:id
  svr.Get(R"(/api/models/([^/]+))", [&modelsData](const httplib::Request& req,
                                                  httplib::Response& res) {
    std::string modelIdStr = req.matches[1];

    if (modelsData.empty() || !modelsData.contains("models")) {
      res.status = 500;
      res.set_content(R"({"error":"Failed to load models data"})",
                      "application/json; charset=utf-8");
      setCORSHeaders(res);
      return;
    }

    int modelIdNum = 0;
    bool isNumericId = true;
    try {
      modelIdNum = std::stoi(modelIdStr);
    } catch (...) {
      isNumericId = false;
    }

    for (const auto& model : modelsData["models"]) {
      json idField = model.value("id", json());

      bool idMatches = false;
      if (isNumericId && idField.is_number_integer()) {
        idMatches = (idField.get<int>() == modelIdNum);
      } else if (idField.is_string()) {
        idMatches = (idField.get<std::string>() == modelIdStr);
      }

      if (idMatches) {
        res.set_content(model.dump(2), "application/json; charset=utf-8");
        setCORSHeaders(res);
        return;
      }
    }

    res.status = 404;
    res.set_content(R"({"error":"Model not found"})",
                    "application/json; charset=utf-8");
    setCORSHeaders(res);
  });

  svr.Get("/hello", [](const httplib::Request&, httplib::Response& res) {
    res.set_content("Hello from 3D Portfolio Backend!",
                    "text/plain; charset=utf-8");
    setCORSHeaders(res);
  });

  // Читаем порт из переменной окружения
  const char* portEnv = std::getenv("PORT");
  int port = portEnv ? std::stoi(portEnv) : 8080;

  std::cout << "Starting server on port " << port << "..." << std::endl;
  std::cout << "API endpoints:" << std::endl;
  std::cout << "  GET /api/models - list all models" << std::endl;
  std::cout << "  GET /api/models/{id} - get model details" << std::endl;
  std::cout << "  GET /hello - health check" << std::endl;

  svr.listen("0.0.0.0", port);

  return 0;
}