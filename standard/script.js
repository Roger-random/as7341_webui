var input_atime;
var input_astep;
var input_gain;
var input_led;
var input_go_button;
var input_repeat_read;

var spectral_chart;

var value_atime;
const value_astep = 3596; // (3596+1)*2.78us = 9.99966ms close enough to 10ms
var value_gain;
var value_led;

var label_sensor_read;
var label_gain;
var label_led;

var raw_json;

const spectral_labels = [
  "415nm",
  "445nm",
  "480nm",
  "515nm",
  "555nm",
  "590nm",
  "630nm",
  "680nm",
  "nir"];

// Conversion of F1-F8 wavelengths to RGB via
// https://academo.org/demos/wavelength-to-colour-relationship/
// https://www.johndcook.com/wavelength_to_RGB.html
// NIR represented by an arbitrarily chosen dark red
const spectral_colors = [
  "#7600ED",
  "#0028FF",
  "#00D5FF",
  "#1FFF00",
  "#B3FF00",
  "#FFDF00",
  "#FF4F00",
  "#FF0000",
  "#220000"];

const clear_label = "clear";
var clear_data = 0;

const devtest = true;

function getURLobject() {
  var espURI;

  if (devtest) {
    // Served from development machine, looking for ESP32 via mDNS name esp32-as7341.local
    espURI = 'http://esp32-as7341.local/';
  } else {
    // When served from ESP32, hostname is our location.
    espURI = window.location.href;
  }

  return new URL('/as7341',espURI);
}

function contentLoaded() {
  input_atime = document.getElementById('atime');
  input_atime.addEventListener('change', recalculate_parameters);
  input_atime.addEventListener('input', recalculate_parameters);
  input_gain = document.getElementById('gain_power');
  input_gain.addEventListener('change', recalculate_parameters);
  input_gain.addEventListener('input', recalculate_parameters);
  input_led = document.getElementById('led_current');
  input_led.addEventListener('change', recalculate_parameters);
  input_led.addEventListener('input', recalculate_parameters);
  input_go_button = document.getElementById('go_button');
  input_go_button.addEventListener('click',initiate_read);
  input_repeat_read = document.getElementById('repeat_read');

  label_sensor_read = document.getElementById('label_sensor_read');
  label_gain = document.getElementById('label_gain');
  label_led = document.getElementById('label_led');

  raw_json = document.getElementById('raw_json');

  recalculate_parameters();

  spectral_chart = new Chart(
    document.getElementById('spectral_chart'),
    {
      type: 'bar',
      data: {
        labels: spectral_labels,
        datasets: [{
          data: [0,0,0,0,0,0,0,0,0],
          borderColor: "#FFFFFF",
          borderWidth: 3,
          backgroundColor: spectral_colors
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            display: false // Turn off legend
          }
        }, // Turn off legend
        events: [] // Disable interactions (No click/hover/etc.)
      }
    });
}

function recalculate_parameters() {
  value_atime = Number(input_atime.value);
  value_gain  = Number(input_gain.value);
  value_led   = Number(input_led.value);

  // Integration time formula from datasheet 10.2.2
  var integration_time = Math.round(((1+value_atime)*(1+value_astep)*2.78)/1000);
  // Display integration_time*2 because readAllChannels() reads F1-F4, then reads again for F5-F8
  label_sensor_read.textContent = "Time to read all sensors: ".concat(integration_time*2, "ms");

  label_gain.textContent = "Sensor gain: ".concat(Math.pow(2, value_gain), "X");

  // Minimum power is 4mA, lower values treated as 0
  if (value_led < 4) {
    value_led = 0;
  }
  label_led.textContent = "LED current: ".concat(value_led, "mA");
}

function initiate_read() {
  input_go_button.disabled = true;
  var as7341 = getURLobject();
  as7341.searchParams.set('atime', value_atime);
  as7341.searchParams.set('astep', value_astep);
  as7341.searchParams.set('gain', value_gain);
  as7341.searchParams.set('led_ma', value_led);

  if(input_repeat_read.checked) {
    as7341.searchParams.set('led_stay_on', 1);
  }

  fetch(as7341)
    .then(function (response) { return response.json(); }, report_sensor_error)
    .then(process_sensor_data, report_sensor_error);
}

function display_raw_json(input_object) {
  raw_json.textContent = JSON.stringify(input_object, null, 2);
}

function process_sensor_data(sensor_data) {
  var spectral_data = spectral_labels.map(x=>sensor_data[x]);
  var clear_level = Number(sensor_data[clear_label]);
  spectral_chart.data.datasets[0].data = spectral_data;
  spectral_chart.options.scales.y.max = clear_level;
  spectral_chart.update();
  display_raw_json(sensor_data);
  if(input_repeat_read.checked) {
    setTimeout(initiate_read);
  } else {
    // Turn off LED.
    var as7341 = getURLobject();
    as7341.searchParams.set('led_ma', 0);
    fetch(as7341); // Ignore response, we just wanted LED off.

    input_go_button.disabled = false;
  }
}

function report_sensor_error(sensor_error) {
  display_raw_json(sensor_error);
}

//////////////////////////////////////////////////////////////////////////
//
//  Page load setup

document.addEventListener('DOMContentLoaded', contentLoaded, false);
