#include "httplib.h"
#include "json.hpp"
#include <iostream>

using json = nlohmann::json;

int main() {
    httplib::Server svr;
    
    svr.Get("/hello", [](const httplib::Request&, httplib::Response& res) {
        res.set_content("Hello from 3D Portfolio Backend!", "text/plain");
    });
    
    svr.Get("/api/test", [](const httplib::Request&, httplib::Response& res) {
        json response = {
            {"status", "ok"},
            {"message", "API is working!"},
            {"version", "0.1.0"}
        };
        res.set_content(response.dump(), "application/json");
    });
    
    std::cout << "Starting server on port 8080..." << std::endl;
    std::cout << "Open http://localhost:8080/hello in your browser" << std::endl;
    std::cout << "Or http://localhost:8080/api/test for JSON response" << std::endl;
    
    svr.listen("0.0.0.0", 8080);
    
    return 0;
}