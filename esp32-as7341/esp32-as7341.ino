#include <WiFi.h>
#include <WiFiClient.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include "secrets.h"

WebServer server(80);

const int led = 2;
const char* mdns_name = "esp32-as7341";

void handleRoot() {
  digitalWrite(led, 1);
  server.send(200, "text/plain", "Read AS7341 via endpopint /as7341/?atime=[0 through 255 inclusive]&astep=[0-65534]&ledma=[4-150]");
  digitalWrite(led, 0);
}

void handleSensorRead() {
  int32_t atime=-1;
  int32_t astep=-1;
  int32_t ledma=-1;

  digitalWrite(led, 1);
  for (uint8_t i = 0; i < server.args(); i++) {
    if (0==server.argName(i).compareTo("atime")) {
      atime = server.arg(i).toInt();
    }
    if (0==server.argName(i).compareTo("astep")) {
      astep = server.arg(i).toInt();
    }
    if (0==server.argName(i).compareTo("ledma")) {
      ledma = server.arg(i).toInt();
    }
  }
  if ((atime >= 0 && atime <= 255) &&
      (astep >= 0 && astep <= 65534) &&
      (ledma >= 4 && ledma <= 150)) {
    String response = "{\n";
    response += "  'settings' : {\n";
    response += "    'atime' : ";
    response += atime;
    response += ",\n";
    response += "    'astep' : ";
    response += astep;
    response += ",\n";
    response += "    'ledma' : ";
    response += ledma;
    response += "\n";
    response += "  }\n";
    response += "}\n";
    server.send(200, "application/json", response);
  } else {
    server.send(400, "text/plain", "Read AS7341 via endpopint /as7341/?atime=[0 through 255 inclusive]&astep=[0-65534]&ledma=[4-150]");
  }

  digitalWrite(led, 0);
}

void handleNotFound() {
  digitalWrite(led, 1);
  String message = "File Not Found\n\n";
  message += "URI: ";
  message += server.uri();
  message += "\nMethod: ";
  message += (server.method() == HTTP_GET) ? "GET" : "POST";
  message += "\nArguments: ";
  message += server.args();
  message += "\n";
  for (uint8_t i = 0; i < server.args(); i++) {
    message += " " + server.argName(i) + ": " + server.arg(i) + "\n";
  }
  server.send(404, "text/plain", message);
  digitalWrite(led, 0);
}

void setup(void) {
  pinMode(led, OUTPUT);
  digitalWrite(led, 0);
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.println("");

  // Wait for WiFi connection
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("Connected to ");
  Serial.println(ssid);
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  // Start mDNS so we are reachable via mdns_name as well
  // as IP address printed above.
  if (MDNS.begin(mdns_name)) {
    Serial.print("MDNS responder started as http://");
    Serial.print(mdns_name);
    Serial.println(".local");
  }

  // Register routes then start HTTP server
  server.on("/", handleRoot);
  server.on("/as7341", handleSensorRead);
  server.onNotFound(handleNotFound);

  server.begin();
  Serial.println("HTTP server started");
}

void loop(void) {
  server.handleClient();
  delay(2);//allow the cpu to switch to other tasks
}
