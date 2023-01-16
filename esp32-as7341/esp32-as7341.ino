#include <WiFi.h>
#include <WiFiClient.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include "secrets.h"

#include <Adafruit_AS7341.h>

// Basic brower UI
#include "basic.index.html.h"
#include "basic.script.js.h"

WebServer server(80);

Adafruit_AS7341 as7341;

const int led = 2;
const char* mdns_name = "esp32-as7341";
const char* usage = "AS7341 sensor HTTP GET endpoint\nRead spectral channels (optional LED setting): /as7341?atime=[0 through 255 inclusive]&astep=[0-65534]&gain=[0-9 as powers of 2]&[optional]led_ma=[0, even numbers 4-150]\nChange LED illumination: /as7341?led_ma=[0,even numbers 4-150]\n";

// Usually "false" so /as7341 endpoint is only accessible from pages we serve.
// Can set to "true" to allow access from HTML UI from development machine.
const bool allow_all_origin = true;

void handleBasicIndex() {
  digitalWrite(led, 1);
  server.send(200, "text/html", basic_index_html);
  digitalWrite(led, 0);
}

void handleBasicScript() {
  digitalWrite(led, 1);
  server.send(200, "text/javascript", basic_script_js);
  digitalWrite(led, 0);
}

void handleCORS() {
  if(allow_all_origin) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
  }
}

bool update_led(int32_t led_ma) {
  if (led_ma >= 4 && led_ma <= 150 && (0 == led_ma%2)) {
    as7341.enableLED(true);
    as7341.setLEDCurrent(led_ma);
    return true;
  } else if (led_ma == 0){
    as7341.enableLED(false);
    return true;
  } else {
    return false;
  }
}

void handleSensorRead() {
  int32_t atime=-1;
  int32_t astep=-1;
  int32_t gain=-1;
  int32_t led_ma=0;

  bool just_led_ma = true;

  digitalWrite(led, 1);
  for (uint8_t i = 0; i < server.args(); i++) {
    if (0==server.argName(i).compareTo("atime")) {
      atime = server.arg(i).toInt();
      just_led_ma = false;
    } else if (0==server.argName(i).compareTo("astep")) {
      astep = server.arg(i).toInt();
      just_led_ma = false;
    } else if (0==server.argName(i).compareTo("gain")) {
      gain = server.arg(i).toInt();
      just_led_ma = false;
    } else if (0==server.argName(i).compareTo("led_ma")) {
      led_ma = server.arg(i).toInt();
    } else {
      Serial.print("Ignoring unknown argument ");
      Serial.print(server.argName(i));
      Serial.print(" value ");
      Serial.println(server.arg(i));
      just_led_ma = false;
    }
  }
  if ((atime >= 0 && atime <= 255) &&
      (astep >= 0 && astep <= 65534) &&
      (gain  >= 0 && gain  <= 9) &&
      update_led(led_ma)) {
    uint16_t readings[12];
    unsigned long read_time;

    as7341.setATIME(atime);
    as7341.setASTEP(astep);
    switch(gain) {
      case 0:
        as7341.setGain(AS7341_GAIN_1X);
        break;
      case 1:
        as7341.setGain(AS7341_GAIN_2X);
        break;
      case 2:
        as7341.setGain(AS7341_GAIN_4X);
        break;
      case 3:
        as7341.setGain(AS7341_GAIN_8X);
        break;
      case 4:
        as7341.setGain(AS7341_GAIN_16X);
        break;
      case 5:
        as7341.setGain(AS7341_GAIN_32X);
        break;
      case 6:
        as7341.setGain(AS7341_GAIN_64X);
        break;
      case 7:
        as7341.setGain(AS7341_GAIN_128X);
        break;
      case 8:
        as7341.setGain(AS7341_GAIN_256X);
        break;
      case 9:
        as7341.setGain(AS7341_GAIN_512X);
        break;
    }

    read_time = millis();
    if (as7341.readAllChannels(readings)){
      read_time = millis() - read_time;

      String response = "{\n";
      response += "  \"415nm\" : ";
      response += readings[AS7341_CHANNEL_415nm_F1];
      response += ",\n";
      response += "  \"445nm\" : ";
      response += readings[AS7341_CHANNEL_445nm_F2];
      response += ",\n";
      response += "  \"480nm\" : ";
      response += readings[AS7341_CHANNEL_480nm_F3];
      response += ",\n";
      response += "  \"515nm\" : ";
      response += readings[AS7341_CHANNEL_515nm_F4];
      response += ",\n";
      response += "  \"555nm\" : ";
      response += readings[AS7341_CHANNEL_555nm_F5];
      response += ",\n";
      response += "  \"590nm\" : ";
      response += readings[AS7341_CHANNEL_590nm_F6];
      response += ",\n";
      response += "  \"630nm\" : ";
      response += readings[AS7341_CHANNEL_630nm_F7];
      response += ",\n";
      response += "  \"680nm\" : ";
      response += readings[AS7341_CHANNEL_680nm_F8];
      response += ",\n";
      response += "  \"clear\" : ";
      response += readings[AS7341_CHANNEL_CLEAR];
      response += ",\n";
      response += "  \"nir\" : ";
      response += readings[AS7341_CHANNEL_NIR];
      response += ",\n";
      response += "  \"settings\" : {\n";
      response += "    \"atime\" : ";
      response += atime;
      response += ",\n";
      response += "    \"astep\" : ";
      response += astep;
      response += ",\n";
      response += "    \"gain\" : ";
      response += (1 << gain);
      response += ",\n";
      response += "    \"led_ma\" : ";
      response += led_ma;
      response += ",\n";
      response += "    \"read_time\" : ";
      response += read_time;
      response += "\n";
      response += "  }\n";
      response += "}\n";
      handleCORS();
      server.send(200, "application/json", response);
    } else {
      // Turn off LED in case of error
      as7341.enableLED(false);
      server.send(500, "text/plain", "Failed readAllChannels()");
    }
  } else if (just_led_ma && update_led(led_ma)) {
    // It is also valid to have just led_ma parameter.
    String response = "{\n";
    response += "  \"settings\" : {\n";
    response += "    \"led_ma\" : ";
    response += led_ma;
    response += "\n";
    response += "  }\n";
    response += "}\n";

    handleCORS();
    server.send(200, "application/json", response);
  } else {
    // LED always gets turned off in case of unhandled error
    as7341.enableLED(false);
    server.send(400, "text/plain", usage);
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

  // Start WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.println("");

  // Start AS7341
  if (!as7341.begin()){
    Serial.println("Could not find AS7341");
    while (1) { delay(10); }
  }

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
  server.on("/as7341", handleSensorRead);
  server.on("/", handleBasicIndex);
  server.on("/index.html", handleBasicIndex);
  server.on("/script.js", handleBasicScript);
  server.on("/basic/index.html", handleBasicIndex);
  server.on("/basic/script.js", handleBasicScript);
  server.onNotFound(handleNotFound);

  server.begin();
  Serial.println("HTTP server started");
}

void loop(void) {
  server.handleClient();
  delay(2);//allow the cpu to switch to other tasks
}
