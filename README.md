# Web UI to interactively play with AS7341 sensor
This project aims to create a browser-based interface for
interactively experimenting with an AS7341 spectral color
sensor.

## Hardware
* ESP32 microcontroller. Developed on chip_id ESP32-D0WDQ6 (revision 1)
of [ESP32 mini development board](https://amzn.to/3kx92rp)(*)
* AS7341 sensor. Developed with [Adafruit #4698 breakout board](https://www.adafruit.com/product/4698)
* Android smartphone or anything with up-to-date Chrome browser. Any modern
browser should work, but I tested on Chrome.

Wiring use standard Arduino ESP32 assignments: GPIO22 is SCL, GPIO21 is SDA
ESP32 activity LED on GPIO2 (can be changed in Arduino sketch.)

## Instructions for use:

1. [Install ESP32 Arduino Core](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html) if not already present.
2. Download or "git clone" this repository
3. Open esp32-as7341/esp32-as7341.ino (Developed on Arduino IDE 2.0.3)
4. Edit `secrets.h` and fill in your WiFi network name and password
5. Compile and upload to ESP32
6. Open browser to 'http://esp32-as7341.local'. If mDNS address of
'esp32-as7341.local' does not work, wait a few minutes and try again. (mDNS
takes a bit of time to propagate.) If it still doesn't work, use the local IP
address. Open Arduino IDE Serial Monitor to watch for bootup message. Upon
successful connection, it will show the network name and assigned IP address.

By default, upon launch the app will immediately start reading the sensor
continuously with default parameters.

![App screenshot](./screenshot.png)

### Parameters

Top three sliders are parameters:
1. Read cycle duration is the estimated time taken per read. Because the sensor
doesn't have enough ADC to read from all its sensors, we configure the sensor
multiplexer (SMUX) to read some of the sensors then reconfigure to read the
rest of sensors. This this estimated time is the sum of sensor integration time
(equivalent to shutter time in photography) once for each configuration,
plus 50ms to account for other overhead.
2. Sensor sensitivity is an amplification from sensor default values. Higher
gain values will result in stronger signal, but the signal will be noisier.
(Photography analogy: 1X gain is ISO 100, 256X gain is ISO 25600.)
3. Illumination LED current controls the onboard LED. 0 turns off the LED.
4mA is minimum and 150mA is maximum light. (AS7341 register allows specifying
current up to 258mA but the LED on Adafruit's AS7341 breakout board has a
limit of 150mA.)

### Start/Stop

Since the app starts continous read automatically, the "Start Read" button
starts deactivated. To stop continuous read, uncheck "Repeat" and it will
stop after completing the current read. At that point, "Start Read" button
should be enabled. Leave "Repeat" unchecked and press "Start Read" to take
a single reading. Check "Repeeat" and press "Start Read" to resume
continuous reading.

### Spectrum Normalization (White Balance)

The spectrum plot is normalized against sunlight by default. To turn off
normalization and see sensor values directly, click "Direct" button.

When use under artificial lighting, point at something that the sensor
should treat as white and click "Current". Normalization curve will be
recalculated so all spectral bars read 1.0 under the new reference.

To reset back to sunlight normalization, click "Sunlight" button.

### Spectral Chart

The bar graph represents values from AS7341 spectral sensors F1-F8,
corresponding to various wavelengths. The remaining three AS7341 sensors
(Clear, NIR, and Flicker) are not represented on this chart.

Each bar of the chart is represented by a color most closely associated
with its wavelength.

Under normal operation, each bar has a white border. When any of the sensors
reach saturation level (overexposure, including Clear and NIR channels)
the white border turns red as warning that values are unreliable.

Chart background color is an approximation of the color seen by the sensor.
This is only a crude approximation until I dive into color theory and CIE
color spaces to figure out how to do this right. (Or until someone does
the hard work and creates a pull request.) Want to tackle the challenge?
[This might be helpful.](https://scipython.com/blog/converting-a-spectrum-to-a-colour/)

### Raw Sensor Data

At the bottom of the page, we have raw sensor values as sent by ESP32.


---
(*) Disclosure: As an Amazon Associate I earn from qualifying purchases.
