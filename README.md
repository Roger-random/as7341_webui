# Web UI to interactively play with AS7341 sensor
This project aims to create a browser-based interface for
interactively experimenting with an AS7341 spectral color
sensor.

## Hardware
* ESP32 microcontroller. Developed on chip_id ESP32-D0WDQ6 (revision 1)
* AS7341 sensor. Developed with [Adafruit #4698 breakout board](https://www.adafruit.com/product/4698)
* Android smartphone or anything with up-to-date Chrome browser. (Other browsers may work but untested.)

Wiring use standard Arduino ESP32 assignments: GPIO22 is SCL, GPIO21 is SDA

## Instructions for use:
1. [Install ESP32 Arduino Core](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html) if not already present.
2. Download or "git clone" this repository
3. Open esp32-as7341/esp32-as7341.ino (Developed on Arduino IDE 2.0.3)
4. Edit `secrets.h` and fill in your WiFi network name and password
5. Compile and upload to ESP32
6. Open Chrome browser to 'http://esp32-as7341.local'

(If mDNS address of 'esp32-as7341.local' does not work, open Arduino IDE Serial
Monitor to watch for bootup message. It should show the network name, the
assigned IP address, and "HTTP server started" message indicating successful
startup.)
